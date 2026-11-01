import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, TextField,
  MenuItem, IconButton, Skeleton, Alert, Stack, TableSortLabel,
  Chip, useTheme, alpha, Collapse,
} from '@mui/material';
import { RefreshCw, ExternalLink, Search, Filter, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LeadStatusChip } from '@/components/leads/LeadStatusChip';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';
import { PriorityChip } from '@/components/leads/PriorityChip';
import { useLeads } from '@/hooks/useLeads';
import type { Lead, LeadStatus, LeadPriority } from '@/services/types';

// ── Filter / sort types ───────────────────────────────────────────────────────
type SortField = 'name' | 'createdAt' | 'lastActivity' | 'nextFollowUp' | 'aiScore';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS: Array<{ value: LeadStatus | ''; label: string }> = [
  { value: '', label: 'All statuses' },
  { value: 'NEW',                    label: 'New' },
  { value: 'CONTACTED',              label: 'Contacted' },
  { value: 'QUALIFIED',              label: 'Qualified' },
  { value: 'APPOINTMENT_REQUESTED',  label: 'Appt Requested' },
  { value: 'APPOINTMENT_CONFIRMED',  label: 'Appt Confirmed' },
  { value: 'TEST_DRIVE_COMPLETED',   label: 'Test Drive Done' },
  { value: 'PROPOSAL',               label: 'Proposal' },
  { value: 'WON',                    label: 'Won' },
  { value: 'LOST',                   label: 'Lost' },
  { value: 'NURTURE',                label: 'Nurture' },
];

const SOURCE_OPTIONS = [
  { value: '',          label: 'All sources' },
  { value: 'WEBSITE',   label: 'Website' },
  { value: 'WALK_IN',   label: 'Walk-in' },
  { value: 'REFERRAL',  label: 'Referral' },
  { value: 'SOCIAL',    label: 'Social' },
  { value: 'OTHER',     label: 'Other' },
];

const INQUIRY_OPTIONS = [
  { value: '',                     label: 'All inquiry types' },
  { value: 'VEHICLE_INFORMATION',  label: 'Vehicle Info' },
  { value: 'TEST_DRIVE',           label: 'Test Drive' },
  { value: 'AVAILABILITY',         label: 'Availability' },
  { value: 'TRADE_IN',             label: 'Trade-In' },
  { value: 'FINANCING',            label: 'Financing' },
  { value: 'GENERAL_QUESTION',     label: 'General Question' },
];

const DEALERSHIP_OPTIONS = [
  { value: '',                     label: 'All dealerships' },
  { value: 'dealership-mercedes',  label: 'Ray Catena Mercedes-Benz' },
  { value: 'dealership-toyota',    label: 'Tri-State Toyota' },
  { value: 'dealership-lexus',     label: 'Premier Lexus' },
];

const PRIORITY_OPTIONS = [
  { value: '',             label: 'All priorities' },
  { value: 'HOT',          label: 'Hot' },
  { value: 'WARM',         label: 'Warm' },
  { value: 'COLD',         label: 'Cold' },
  { value: 'UNCLASSIFIED', label: 'Unclassified' },
];

const FOLLOW_UP_OPTIONS = [
  { value: '',        label: 'All follow-ups' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today',   label: 'Due today' },
  { value: 'week',    label: 'Due this week' },
];

function fmtVehicle(vi?: string | { year?: number; make?: string; model?: string; trim?: string }): string {
  if (!vi) return '—';
  if (typeof vi === 'string') return vi;
  return [vi.year, vi.make, vi.model].filter(Boolean).join(' ') || '—';
}

function computePriority(lead: Lead): LeadPriority {
  if (lead.priority) return lead.priority;
  if (lead.aiScore && lead.aiScore >= 80) return 'HOT';
  if (lead.aiScore && lead.aiScore >= 60) return 'WARM';
  return 'COLD';
}

function isFollowUpMatch(lead: Lead, filter: string): boolean {
  if (!filter) return true;
  if (!lead.nextFollowUp) return false;
  const d = new Date(lead.nextFollowUp);
  const now = new Date();
  const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
  const endOfToday   = new Date(now); endOfToday.setHours(23, 59, 59, 999);
  const endOfWeek    = new Date(now); endOfWeek.setDate(now.getDate() + 7);
  if (filter === 'overdue') return d < startOfToday;
  if (filter === 'today')   return d >= startOfToday && d <= endOfToday;
  if (filter === 'week')    return d > endOfToday && d <= endOfWeek;
  return true;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const LeadsPage: React.FC = () => {
  const navigate   = useNavigate();
  const theme      = useTheme();

  // Filters
  const [search,         setSearch]         = useState('');
  const [statusFilter,   setStatusFilter]   = useState<LeadStatus | ''>('');
  const [sourceFilter,   setSourceFilter]   = useState('');
  const [inquiryFilter,  setInquiryFilter]  = useState('');
  const [dealershipFilter, setDealershipFilter] = useState('');
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [followUpFilter, setFollowUpFilter] = useState('');
  const [dateFrom,       setDateFrom]       = useState('');
  const [dateTo,         setDateTo]         = useState('');
  const [advancedOpen,   setAdvancedOpen]   = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir,   setSortDir]   = useState<SortDir>('desc');

  const { leads, total, isLoading, error, refetch, loadMore, nextToken } = useLeads(
    statusFilter ? { status: statusFilter } : undefined
  );

  const filtered = useMemo(() => {
    let result = leads;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }

    if (sourceFilter)      result = result.filter((l) => l.source === sourceFilter);
    if (inquiryFilter)     result = result.filter((l) => l.inquiryType === inquiryFilter);
    if (dealershipFilter)  result = result.filter((l) => l.dealershipId === dealershipFilter);
    if (salespersonFilter) result = result.filter((l) =>
      (l.assignedToName ?? l.assignedTo ?? '').toLowerCase().includes(salespersonFilter.toLowerCase())
    );
    if (priorityFilter)    result = result.filter((l) => computePriority(l) === priorityFilter);
    if (followUpFilter)    result = result.filter((l) => isFollowUpMatch(l, followUpFilter));
    if (dateFrom)          result = result.filter((l) => new Date(l.createdAt) >= new Date(dateFrom));
    if (dateTo)            result = result.filter((l) => new Date(l.createdAt) <= new Date(dateTo + 'T23:59:59'));

    // Sort
    return [...result].sort((a, b) => {
      let av: string | number = '';
      let bv: string | number = '';
      switch (sortField) {
        case 'name':        av = `${a.firstName} ${a.lastName}`.toLowerCase(); bv = `${b.firstName} ${b.lastName}`.toLowerCase(); break;
        case 'createdAt':   av = a.createdAt;   bv = b.createdAt; break;
        case 'lastActivity':av = a.lastActivity ?? a.updatedAt; bv = b.lastActivity ?? b.updatedAt; break;
        case 'nextFollowUp':av = a.nextFollowUp ?? ''; bv = b.nextFollowUp ?? ''; break;
        case 'aiScore':     av = a.aiScore ?? 0; bv = b.aiScore ?? 0; break;
      }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sortDir === 'asc' ? 1 : -1);
    });
  }, [leads, search, sourceFilter, inquiryFilter, dealershipFilter, salespersonFilter,
      priorityFilter, followUpFilter, dateFrom, dateTo, sortField, sortDir]);

  // Active filter count (for badge)
  const activeFilterCount = [
    statusFilter, sourceFilter, inquiryFilter, dealershipFilter,
    salespersonFilter, priorityFilter, followUpFilter, dateFrom, dateTo,
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setStatusFilter(''); setSourceFilter(''); setInquiryFilter('');
    setDealershipFilter(''); setSalespersonFilter(''); setPriorityFilter('');
    setFollowUpFilter(''); setDateFrom(''); setDateTo('');
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortHeader: React.FC<{ field: SortField; label: string; align?: 'left' | 'right' | 'center' }> = ({ field, label, align = 'left' }) => (
    <TableCell sortDirection={sortField === field ? sortDir : false} sx={{ color: 'text.secondary' }} align={align}>
      <TableSortLabel active={sortField === field} direction={sortField === field ? sortDir : 'asc'}
        onClick={() => handleSort(field)} sx={{ fontSize: '0.72rem' }}>
        {label}
      </TableSortLabel>
    </TableCell>
  );

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Leads{' '}
          {!isLoading && <Chip label={`${filtered.length} / ${total}`} size="small" sx={{ ml: 0.5, fontWeight: 700 }} />}
        </Typography>
        <Button startIcon={<RefreshCw size={16} />} onClick={refetch} variant="outlined" size="small" disabled={isLoading}>
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Primary filter row ─────────────────────────────────────────── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1 }} alignItems="flex-start">
        <TextField
          label="Search" size="small" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Name, email or phone"
          sx={{ minWidth: 200, flex: 1 }}
          InputProps={{ startAdornment: <Search size={14} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
        />
        <TextField select label="Status" size="small" value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as LeadStatus | '')} sx={{ minWidth: 150 }}>
          {STATUS_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField select label="Source" size="small" value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)} sx={{ minWidth: 130 }}>
          {SOURCE_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <Button
          variant={advancedOpen ? 'contained' : 'outlined'}
          size="small"
          onClick={() => setAdvancedOpen((v) => !v)}
          startIcon={<Filter size={14} />}
          endIcon={<ChevronDown size={14} style={{ transform: advancedOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />}
          sx={{ flexShrink: 0 }}
        >
          More filters{activeFilterCount > 0 && <Chip label={activeFilterCount} size="small" sx={{ ml: 1, height: 18, fontSize: '0.65rem', bgcolor: 'primary.main', color: '#fff' }} />}
        </Button>
        {activeFilterCount > 0 && (
          <Button size="small" variant="text" color="error" onClick={clearAllFilters} startIcon={<X size={14} />} sx={{ flexShrink: 0 }}>
            Clear all
          </Button>
        )}
      </Stack>

      {/* ── Advanced filter row ────────────────────────────────────────── */}
      <Collapse in={advancedOpen}>
        <Box sx={{ p: 2, mb: 1, bgcolor: alpha(theme.palette.primary.main, 0.03), borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} flexWrap="wrap" sx={{ gap: 1.5 }}>
            <TextField select label="Dealership" size="small" value={dealershipFilter}
              onChange={(e) => setDealershipFilter(e.target.value)} sx={{ minWidth: 200 }}>
              {DEALERSHIP_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select label="Inquiry type" size="small" value={inquiryFilter}
              onChange={(e) => setInquiryFilter(e.target.value)} sx={{ minWidth: 160 }}>
              {INQUIRY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select label="Priority" size="small" value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)} sx={{ minWidth: 140 }}>
              {PRIORITY_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField select label="Follow-up" size="small" value={followUpFilter}
              onChange={(e) => setFollowUpFilter(e.target.value)} sx={{ minWidth: 140 }}>
              {FOLLOW_UP_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
            </TextField>
            <TextField
              label="Salesperson" size="small" value={salespersonFilter}
              onChange={(e) => setSalespersonFilter(e.target.value)}
              placeholder="Search by name or email" sx={{ minWidth: 180 }}
              InputProps={{ startAdornment: <Search size={13} style={{ marginRight: 6, color: theme.palette.text.secondary }} /> }}
            />
            <TextField
              label="Created from" type="date" size="small"
              InputLabelProps={{ shrink: true }} value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} sx={{ minWidth: 150 }}
            />
            <TextField
              label="Created to" type="date" size="small"
              InputLabelProps={{ shrink: true }} value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} sx={{ minWidth: 150 }}
            />
          </Stack>
        </Box>
      </Collapse>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {isLoading && filtered.length === 0 ? (
        <SkeletonTable />
      ) : filtered.length === 0 ? (
        <EmptyLeads hasFilters={activeFilterCount > 0 || !!search} onClear={clearAllFilters} />
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                <SortHeader field="name" label="Customer" />
                <TableCell sx={{ color: 'text.secondary' }}>Dealership</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Vehicle Interest</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Source / Type</TableCell>
                <TableCell sx={{ color: 'text.secondary' }}>Priority</TableCell>
                <SortHeader field="aiScore" label="Score" align="center" />
                <TableCell sx={{ color: 'text.secondary' }}>Status</TableCell>
                <SortHeader field="lastActivity" label="Last Activity" />
                <SortHeader field="nextFollowUp" label="Follow-up" />
                <TableCell sx={{ color: 'text.secondary' }}>Salesperson</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((lead) => {
                const priority   = computePriority(lead);
                const isOverdue  = lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date();
                return (
                  <TableRow key={lead.leadId} hover sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/leads/${lead.leadId}`)}>
                    <TableCell sx={{ fontWeight: 600 }}>
                      {lead.firstName} {lead.lastName}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {lead.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{lead.dealershipName ?? lead.dealershipId ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>{fmtVehicle(lead.vehicleInterest)}</TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">{lead.source}</Typography>
                      {lead.inquiryType && (
                        <Typography variant="caption" color="text.secondary">
                          {lead.inquiryType.replace(/_/g, ' ').toLowerCase()}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell><PriorityChip priority={priority} /></TableCell>
                    <TableCell align="center"><LeadScoreBadge score={lead.aiScore} /></TableCell>
                    <TableCell><LeadStatusChip status={lead.status} /></TableCell>
                    <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                      {lead.lastActivity ? new Date(lead.lastActivity).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {lead.nextFollowUp ? (
                        <Typography variant="caption" sx={{ color: isOverdue ? 'error.main' : 'text.primary', fontWeight: isOverdue ? 700 : 400 }}>
                          {isOverdue ? '⚠ ' : ''}{new Date(lead.nextFollowUp).toLocaleDateString()}
                        </Typography>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {lead.assignedToName ?? lead.assignedTo ?? 'Unassigned'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/leads/${lead.leadId}`); }}>
                        <ExternalLink size={14} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {nextToken && !isLoading && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button onClick={loadMore} variant="text">Load more</Button>
        </Box>
      )}
    </Box>
  );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const SkeletonTable: React.FC = () => (
  <TableContainer component={Paper} variant="outlined">
    <Table size="small">
      <TableBody>
        {Array.from({ length: 8 }).map((_, i) => (
          <TableRow key={i}>
            {Array.from({ length: 11 }).map((__, j) => (
              <TableCell key={j}><Skeleton /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const EmptyLeads: React.FC<{ hasFilters: boolean; onClear: () => void }> = ({ hasFilters, onClear }) => (
  <Box sx={{ py: 6, textAlign: 'center' }}>
    <Typography variant="body1" color="text.secondary">
      {hasFilters ? 'No leads match your filters.' : 'No leads yet. Submit a lead form to get started.'}
    </Typography>
    {hasFilters && (
      <Button variant="text" onClick={onClear} sx={{ mt: 1 }}>Clear filters</Button>
    )}
  </Box>
);
