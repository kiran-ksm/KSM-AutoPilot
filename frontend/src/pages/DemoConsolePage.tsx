import React, { useState } from 'react';
import {
  Box, Typography, Button, Chip, Card, CardContent, Alert, Stack, Divider,
  IconButton, Tooltip, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, useTheme, alpha,
} from '@mui/material';
import { Trash2, Copy, Terminal, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useDemoMode } from '@/contexts/DemoModeContext';
import type { DemoEvent, DemoEventChannel } from '@/contexts/DemoModeContext';

const CHANNEL_COLORS: Record<DemoEventChannel, { bg: string; text: string }> = {
  SMS:         { bg: 'rgba(37,99,235,0.08)',   text: '#2563EB' },
  EMAIL:       { bg: 'rgba(124,58,237,0.08)',  text: '#7C3AED' },
  AI:          { bg: 'rgba(21,128,61,0.08)',   text: '#15803D' },
  APPOINTMENT: { bg: 'rgba(8,145,178,0.08)',   text: '#0891B2' },
  ASSIGNMENT:  { bg: 'rgba(180,83,9,0.08)',    text: '#B45309' },
  SYSTEM:      { bg: 'rgba(100,116,139,0.08)', text: '#64748B' },
};

const CONSENT_COLORS: Record<DemoEvent['consentDecision'], { text: string }> = {
  GRANTED:      { text: '#15803D' },
  UNKNOWN:      { text: '#B45309' },
  NOT_REQUIRED: { text: '#64748B' },
};

export const DemoConsolePage: React.FC = () => {
  const { isDemoMode, events, clearEvents } = useDemoMode();
  const theme = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const copyPayload = (payload: Record<string, unknown>) =>
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));

  if (!isDemoMode) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} sx={{ mb: 2 }}>Demo Console</Typography>
        <Alert severity="info">
          Demo Console is only visible when <strong>VITE_DEMO_MODE=true</strong>.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Terminal size={24} style={{ color: theme.palette.warning.main }} />
          <Typography variant="h4" fontWeight={700}>Demo Console</Typography>
          <Chip label={`${events.length} events`} size="small" color="warning" />
        </Stack>
        <Button
          startIcon={<Trash2 size={16} />}
          onClick={clearEvents}
          variant="outlined"
          color="error"
          size="small"
          disabled={events.length === 0}
        >
          Clear
        </Button>
      </Box>

      {/* §9.1 disclaimer */}
      <Alert severity="warning" icon={<Shield size={18} />} sx={{ mb: 3 }}>
        <strong>DEMO MODE active — no real messages sent.</strong>{' '}
        All SMS and email events are intercepted per §9.1. Destinations are masked.
        Payloads are logged here for developer/demo inspection only and are not persisted
        across page reloads. In production, messaging goes through AWS SNS / SES.
      </Alert>

      {events.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Terminal size={48} style={{ color: theme.palette.text.disabled, marginBottom: 8 }} />
            <Typography color="text.secondary">No events yet.</Typography>
            <Typography variant="caption" color="text.secondary">
              Send an SMS or email from a lead to see it here.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                {['Time', 'Channel', 'Type', 'Lead ID', 'Destination (masked)', 'Preview', 'Consent', 'Status', ''].map((h) => (
                  <TableCell key={h} sx={{ color: 'text.secondary', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event) => {
                const channelCfg  = CHANNEL_COLORS[event.channel] ?? CHANNEL_COLORS.SYSTEM;
                const consentCfg  = CONSENT_COLORS[event.consentDecision];
                const isExpanded  = expandedId === event.id;
                return (
                  <React.Fragment key={event.id}>
                    <TableRow hover>
                      <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={event.channel}
                          size="small"
                          sx={{ fontSize: '0.65rem', fontWeight: 700, bgcolor: channelCfg.bg, color: channelCfg.text }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{event.type}</TableCell>
                      <TableCell sx={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {event.leadId ?? '—'}
                      </TableCell>
                      {/* §9.1: masked destination */}
                      <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>
                        {event.destinationMasked}
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.subject ? <><strong>{event.subject}</strong> — </> : ''}
                        {event.messagePreview ?? '—'}
                      </TableCell>
                      {/* §9.1: consent decision */}
                      <TableCell>
                        <Typography variant="caption" sx={{ color: consentCfg.text, fontWeight: 600 }}>
                          {event.consentDecision}
                        </Typography>
                      </TableCell>
                      {/* §9.1: SIMULATED status */}
                      <TableCell>
                        <Chip label="SIMULATED" size="small" sx={{ fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha(theme.palette.warning.main, 0.08), color: theme.palette.warning.main }} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title={isExpanded ? 'Hide payload' : 'Show payload'}>
                            <IconButton size="small" onClick={() => toggleExpand(event.id)}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Copy payload">
                            <IconButton size="small" onClick={() => copyPayload(event.payload)}>
                              <Copy size={14} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                    {/* Expandable payload inspector */}
                    {isExpanded && (
                      <TableRow>
                        <TableCell colSpan={9} sx={{ p: 0 }}>
                          <Box sx={{ m: 1.5 }}>
                            <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" gap={0.5}>
                              <Chip label={`Correlation ID: ${event.id}`} size="small" sx={{ fontSize: '0.65rem', fontFamily: 'monospace' }} />
                              {event.tenantId && <Chip label={`Tenant: ${event.tenantId}`} size="small" sx={{ fontSize: '0.65rem' }} />}
                              {event.dealershipId && <Chip label={`Dealership: ${event.dealershipId}`} size="small" sx={{ fontSize: '0.65rem' }} />}
                            </Stack>
                            <Box
                              component="pre"
                              sx={{
                                fontSize: 11, bgcolor: theme.palette.mode === 'dark' ? '#0B1220' : '#F8FAFC',
                                border: `1px solid ${theme.palette.divider}`,
                                p: 1.5, borderRadius: 1.5, overflowX: 'auto', m: 0,
                                fontFamily: 'monospace', lineHeight: 1.5,
                              }}
                            >
                              {JSON.stringify(event.payload, null, 2)}
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary">
        Events are stored in memory only and cleared on page reload.
        Correlation IDs (§9.1) are generated per event for traceability.
        In production, all messaging is audited in CloudWatch with structured JSON logs.
      </Typography>
    </Box>
  );
};
