import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  MenuItem,
  TextField,
  Alert,
  CircularProgress,
  Stack,
  Snackbar,
  useTheme,
  alpha,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Tooltip,
  Select,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowLeft, Sparkles, Mail, Phone, Calendar, User,
  Car, FileText, MessageSquare, TrendingUp, ArrowRight,
  Clock, CalendarPlus, MapPin, Link2, Tag, Shield,
  CheckCircle, XCircle, AlertCircle, Edit2, Save,
} from 'lucide-react';
import { LeadStatusChip } from '@/components/leads/LeadStatusChip';
import { LeadScoreBadge } from '@/components/leads/LeadScoreBadge';
import { PriorityChip } from '@/components/leads/PriorityChip';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { leadsService } from '@/services/leadsService';
import { aiService } from '@/services/aiService';
import { useMessagingService } from '@/services/messagingService';
import type { Lead, LeadStatus } from '@/services/types';

const STATUS_OPTIONS: LeadStatus[] = [
  'NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_REQUESTED',
  'APPOINTMENT_CONFIRMED', 'TEST_DRIVE_COMPLETED', 'PROPOSAL', 'WON', 'LOST', 'NURTURE',
];

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  QUALIFIED: 'Qualified',
  APPOINTMENT_REQUESTED: 'Appointment Requested',
  APPOINTMENT_CONFIRMED: 'Appointment Confirmed',
  TEST_DRIVE_COMPLETED: 'Test Drive Completed',
  PROPOSAL: 'Proposal',
  WON: 'Won',
  LOST: 'Lost',
  NURTURE: 'Nurture',
};

const INQUIRY_LABELS: Record<string, string> = {
  VEHICLE_INFORMATION: 'Vehicle Information',
  TEST_DRIVE: 'Test Drive',
  AVAILABILITY: 'Availability',
  TRADE_IN: 'Trade-In',
  FINANCING: 'Financing',
  GENERAL_QUESTION: 'General Question',
};

const ACTIVITY_META: Record<string, { icon: React.ReactNode; color: string }> = {
  NOTE:          { icon: <FileText size={14} />,      color: '#64748B' },
  SMS:           { icon: <MessageSquare size={14} />,  color: '#2563EB' },
  EMAIL:         { icon: <Mail size={14} />,           color: '#7C3AED' },
  STATUS_CHANGE: { icon: <TrendingUp size={14} />,     color: '#B45309' },
  SCORE:         { icon: <Sparkles size={14} />,       color: '#15803D' },
  ASSIGNMENT:    { icon: <User size={14} />,           color: '#0EA5E9' },
  APPOINTMENT:   { icon: <Calendar size={14} />,       color: '#DC2626' },
};

// ── Helper ────────────────────────────────────────────────────────────────────
function fmtVehicle(vi?: string | { year?: number; make?: string; model?: string; trim?: string }): string {
  if (!vi) return 'Not specified';
  if (typeof vi === 'string') return vi;
  return [vi.year, vi.make, vi.model, vi.trim].filter(Boolean).join(' ') || 'Not specified';
}

function fmtDateTime(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso?: string): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main component ────────────────────────────────────────────────────────────
export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const messaging = useMessagingService();
  const theme = useTheme();

  const [lead, setLead]           = useState<Lead | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [scoring, setScoring]     = useState(false);
  const [toast, setToast]         = useState<string | null>(null);
  const [apptDialogOpen, setApptDialogOpen] = useState(false);

  // Editable fields
  const [editStatus, setEditStatus]     = useState<LeadStatus>('NEW');
  const [editNotes, setEditNotes]       = useState('');
  const [editAssigned, setEditAssigned] = useState('');
  const [editFollowUp, setEditFollowUp] = useState('');
  const [saving, setSaving]             = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    (async () => {
      try {
        const data = await leadsService.get(leadId);
        setLead(data);
        setEditStatus(data.status);
        setEditNotes(data.notes ?? '');
        setEditAssigned(data.assignedTo ?? '');
        setEditFollowUp(data.nextFollowUp ? data.nextFollowUp.slice(0, 16) : '');
      } catch { setError('Failed to load lead'); }
      finally  { setIsLoading(false); }
    })();
  }, [leadId]);

  const handleSave = async () => {
    if (!leadId || !lead) return;
    setSaving(true);
    try {
      const updated = await leadsService.update(leadId, {
        status:       editStatus,
        notes:        editNotes,
        assignedTo:   editAssigned || undefined,
        nextFollowUp: editFollowUp ? new Date(editFollowUp).toISOString() : undefined,
      });
      setLead(updated);
      setEditingNotes(false);
      setToast('Lead saved');
    } catch { setError('Failed to save changes'); }
    finally  { setSaving(false); }
  };

  const handleScore = async () => {
    if (!leadId) return;
    setScoring(true);
    try {
      const result = await aiService.scoreLead(leadId);
      setLead((prev) => prev ? { ...prev, aiScore: result.score, aiReasoning: result.reasoning } : prev);
      setToast(`AI Score: ${result.score}/100`);
    } catch { setError('AI scoring failed'); }
    finally  { setScoring(false); }
  };

  const handleSendSms = async () => {
    if (!lead) return;
    await messaging.sendSms({ leadId: lead.leadId, message: `Hi ${lead.firstName}, thanks for your interest! How can we help you today?` });
    setToast(messaging.isDemoMode ? 'SMS logged to Demo Console' : 'SMS sent');
  };

  const handleSendEmail = async () => {
    if (!lead) return;
    const vehicle = fmtVehicle(lead.vehicleInterest);
    const salesperson = lead.assignedToName ?? lead.assignedTo ?? 'KSM AutoPilot Team';
    const dealership = lead.dealershipName ?? 'our dealership';

    const subject = `Following up on your ${vehicle !== '—' ? vehicle : 'vehicle'} enquiry`;
    const body = [
      `Hi ${lead.firstName},`,
      '',
      `Thank you for reaching out to ${dealership}. We received your enquiry${vehicle !== '—' ? ` about the ${vehicle}` : ''} and would love to help you find the perfect vehicle.`,
      '',
      `${lead.inquiryType === 'TEST_DRIVE'
        ? `We'd be happy to arrange a test drive at your convenience. Please let us know your preferred date and time and we will confirm the appointment.`
        : lead.inquiryType === 'FINANCING'
        ? `Our finance team is available to walk you through all available options with no obligation.`
        : `One of our specialists will be in touch shortly to answer your questions.`
      }`,
      '',
      `Best regards,`,
      salesperson,
      dealership,
    ].join('\n');

    try {
      const result = await messaging.sendEmail({ leadId: lead.leadId, subject, body });
      setToast(result.status === 'SENT' ? `Email sent to ${lead.email}` : 'Email queued');
    } catch {
      setError('Failed to send email');
    }
  };

  // ── Build synthetic activity timeline ────────────────────────────────────────
  const activities = React.useMemo(() => {
    if (!lead) return [];
    const items: Array<{ type: string; description: string; timestamp: string; id: string }> = [];
    items.push({ type: 'NOTE', description: 'Lead created', timestamp: lead.createdAt, id: 'created' });
    if (lead.assignedTo) items.push({ type: 'ASSIGNMENT', description: `Assigned to ${lead.assignedToName ?? lead.assignedTo}`, timestamp: lead.updatedAt, id: 'assigned' });
    if (lead.aiScore) items.push({ type: 'SCORE', description: `AI score: ${lead.aiScore}/100. ${lead.aiReasoning?.slice(0, 80) ?? ''}`, timestamp: lead.updatedAt, id: 'score' });
    if (lead.notes) items.push({ type: 'NOTE', description: `Note: ${lead.notes.slice(0, 120)}`, timestamp: lead.updatedAt, id: 'note' });
    if (lead.status !== 'NEW') items.push({ type: 'STATUS_CHANGE', description: `Status updated to ${STATUS_LABELS[lead.status]}`, timestamp: lead.updatedAt, id: 'status' });
    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [lead]);

  if (isLoading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;
  if (!lead)     return <Box><Alert severity="error">{error ?? 'Lead not found'}</Alert><Button sx={{ mt: 2 }} onClick={() => navigate('/leads')}>Back</Button></Box>;

  const vi = lead.vehicleInterest;
  const isOverdue = lead.nextFollowUp && new Date(lead.nextFollowUp) < new Date();
  const priority  = lead.priority ?? (lead.aiScore && lead.aiScore >= 80 ? 'HOT' : lead.aiScore && lead.aiScore >= 60 ? 'WARM' : 'COLD');

  return (
    <Box sx={{ pb: 4 }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <Button startIcon={<ArrowLeft size={16} />} onClick={() => navigate('/leads')} size="small" variant="text">
          Leads
        </Button>
        <ArrowRight size={14} style={{ color: theme.palette.text.secondary }} />
        <Typography variant="body2" color="text.secondary" noWrap>{lead.firstName} {lead.lastName}</Typography>
      </Stack>

      {/* ── Hero header ──────────────────────────────────────────────────── */}
      <Box sx={{ mb: 3, p: 3, borderRadius: 3, bgcolor: 'background.paper', border: `1px solid ${theme.palette.divider}` }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 52, height: 52, bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700, fontSize: 20 }}>
              {lead.firstName[0]}{lead.lastName[0]}
            </Avatar>
            <Box>
              <Typography variant="h4" fontWeight={700}>{lead.firstName} {lead.lastName}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                <LeadStatusChip status={lead.status} size="medium" />
                {lead.aiScore !== undefined && <LeadScoreBadge score={lead.aiScore} />}
                <PriorityChip priority={priority} />
                {lead.inquiryType && (
                  <Chip label={INQUIRY_LABELS[lead.inquiryType] ?? lead.inquiryType} size="small" sx={{ fontSize: '0.7rem' }} />
                )}
              </Stack>
            </Box>
          </Stack>

          {/* Quick contact buttons */}
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap', gap: 1 }}>
            <Tooltip title={lead.phone}>
              <Button variant="outlined" size="small" startIcon={<Phone size={14} />} onClick={handleSendSms}>SMS</Button>
            </Tooltip>
            <Tooltip title={`Send email to ${lead.email}`}>
              <Button variant="outlined" size="small" startIcon={<Mail size={14} />} onClick={handleSendEmail}>Email</Button>
            </Tooltip>
            <Button variant="outlined" size="small" startIcon={<CalendarPlus size={14} />} onClick={() => setApptDialogOpen(true)}>
              Appointment
            </Button>
            <Button variant="contained" size="small" startIcon={scoring ? <CircularProgress size={14} color="inherit" /> : <Sparkles size={14} />} onClick={handleScore} disabled={scoring}>
              {scoring ? 'Scoring…' : 'AI Score'}
            </Button>
          </Stack>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={2}>
        {/* ── LEFT COLUMN ──────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>

            {/* Contact information */}
            <InfoCard title="Contact Information" icon={<User size={16} />}>
              <ContactRow icon={<Mail size={14} />} label="Email" value={lead.email} copyable />
              <ContactRow icon={<Phone size={14} />} label="Phone" value={lead.phone} copyable />
              <ContactRow icon={<MapPin size={14} />} label="Dealership" value={lead.dealershipName ?? lead.dealershipId ?? '—'} />
              <ContactRow icon={<User size={14} />} label="Salesperson" value={lead.assignedToName ?? lead.assignedTo ?? 'Unassigned'} />
              <ContactRow icon={<Clock size={14} />} label="Created" value={fmtDate(lead.createdAt)} />
              <ContactRow icon={<Clock size={14} />} label="Last activity" value={`${fmtDate(lead.lastActivity)} (${timeAgo(lead.lastActivity)})`} />
            </InfoCard>

            {/* Vehicle interest */}
            {vi && (
              <InfoCard title="Vehicle Interest" icon={<Car size={16} />}>
                {typeof vi === 'object' ? (
                  <>
                    {vi.year  && <ContactRow icon={<Car size={14} />} label="Year"  value={String(vi.year)} />}
                    {vi.make  && <ContactRow icon={<Car size={14} />} label="Make"  value={vi.make} />}
                    {vi.model && <ContactRow icon={<Car size={14} />} label="Model" value={vi.model} />}
                    {vi.trim  && <ContactRow icon={<Car size={14} />} label="Trim"  value={vi.trim} />}
                    {vi.vin   && <ContactRow icon={<Tag size={14} />} label="VIN"   value={vi.vin} mono />}
                    {vi.stockNumber && <ContactRow icon={<Tag size={14} />} label="Stock #" value={vi.stockNumber} mono />}
                  </>
                ) : (
                  <ContactRow icon={<Car size={14} />} label="Interest" value={vi} />
                )}
                <ContactRow icon={<Link2 size={14} />} label="Source" value={lead.source} />
                {lead.message && (
                  <Box sx={{ mt: 1, p: 1.5, borderRadius: 1.5, bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                    <Typography variant="caption" color="text.secondary">Customer message</Typography>
                    <Typography variant="body2" sx={{ mt: 0.25 }}>{lead.message}</Typography>
                  </Box>
                )}
              </InfoCard>
            )}

            {/* Consent & communication preferences */}
            <InfoCard title="Consent & Preferences" icon={<Shield size={16} />}>
              <Stack spacing={0.75}>
                <ConsentRow label="Email" granted={lead.consent?.email} />
                <ConsentRow label="SMS / Text" granted={lead.consent?.sms} />
                <ConsentRow label="Phone call" granted={lead.consent?.phone} />
                {lead.preferredContactMethod && (
                  <ContactRow icon={<Phone size={14} />} label="Preferred method" value={lead.preferredContactMethod} />
                )}
                {lead.preferredContactTime && (
                  <ContactRow icon={<Clock size={14} />} label="Preferred time" value={lead.preferredContactTime} />
                )}
              </Stack>
            </InfoCard>

            {/* Attribution */}
            {lead.attribution && Object.values(lead.attribution).some(Boolean) && (
              <InfoCard title="Lead Attribution" icon={<Link2 size={16} />}>
                {lead.attribution.utmSource   && <ContactRow icon={<Tag size={14} />} label="Source"   value={lead.attribution.utmSource} />}
                {lead.attribution.utmMedium   && <ContactRow icon={<Tag size={14} />} label="Medium"   value={lead.attribution.utmMedium} />}
                {lead.attribution.utmCampaign && <ContactRow icon={<Tag size={14} />} label="Campaign" value={lead.attribution.utmCampaign} />}
                {lead.attribution.utmContent  && <ContactRow icon={<Tag size={14} />} label="Content"  value={lead.attribution.utmContent} />}
                {lead.attribution.landingPageUrl && (
                  <ContactRow icon={<Link2 size={14} />} label="Landing page" value={lead.attribution.landingPageUrl.slice(0, 40) + (lead.attribution.landingPageUrl.length > 40 ? '…' : '')} />
                )}
              </InfoCard>
            )}
          </Stack>
        </Grid>

        {/* ── MIDDLE COLUMN ─────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>

            {/* Status + assignment + follow-up */}
            <Card>
              <CardHeader title="Lead Management" titleTypographyProps={{ variant: 'subtitle1' }} />
              <CardContent sx={{ pt: 0 }}>
                <Stack spacing={2}>
                  {/* Status */}
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select label="Status" value={editStatus} onChange={(e) => setEditStatus(e.target.value as LeadStatus)}>
                      {STATUS_OPTIONS.map((s) => (
                        <MenuItem key={s} value={s}>{STATUS_LABELS[s]}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Assigned to */}
                  <TextField
                    label="Assigned salesperson"
                    size="small"
                    fullWidth
                    value={editAssigned}
                    onChange={(e) => setEditAssigned(e.target.value)}
                    placeholder="Email or name"
                    InputProps={{ startAdornment: <User size={14} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
                  />

                  {/* Next follow-up */}
                  <TextField
                    label="Next follow-up"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    value={editFollowUp}
                    onChange={(e) => setEditFollowUp(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(isOverdue)}
                    helperText={isOverdue ? `⚠ Overdue — was ${fmtDate(lead.nextFollowUp)}` : editFollowUp ? `Scheduled: ${fmtDateTime(editFollowUp)}` : ''}
                  />

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSave}
                    disabled={saving}
                    startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save size={16} />}
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            {/* AI customer summary */}
            <Card>
              <CardHeader
                title="AI Customer Summary"
                titleTypographyProps={{ variant: 'subtitle1' }}
                avatar={<Sparkles size={16} style={{ color: theme.palette.primary.main }} />}
                subheader="AI-generated — requires human review before acting"
              />
              <CardContent sx={{ pt: 0 }}>
                {lead.aiReasoning ? (
                  <>
                    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.success.main, 0.06), mb: 1.5 }}>
                      <Typography variant="body2" sx={{ lineHeight: 1.7 }}>{lead.aiReasoning}</Typography>
                    </Box>
                    {lead.aiReasoning && (
                      <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.06) }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Suggested next action</Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {(lead as any).aiNextAction ?? 'Follow up within 48 hours'}
                        </Typography>
                      </Box>
                    )}
                    <Button
                      variant="outlined"
                      size="small"
                      sx={{ mt: 1.5 }}
                      startIcon={scoring ? <CircularProgress size={14} /> : <Sparkles size={14} />}
                      onClick={handleScore}
                      disabled={scoring}
                    >
                      {scoring ? 'Re-analyzing…' : 'Re-run Analysis'}
                    </Button>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No AI analysis yet. Run scoring to generate a customer interest summary.
                    </Typography>
                    <Button
                      variant="outlined"
                      startIcon={scoring ? <CircularProgress size={16} /> : <Sparkles size={16} />}
                      onClick={handleScore}
                      disabled={scoring}
                    >
                      {scoring ? 'Analyzing…' : 'Run AI Analysis'}
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Salesperson notes */}
            <Card>
              <CardHeader
                title="Notes"
                titleTypographyProps={{ variant: 'subtitle1' }}
                action={
                  <Tooltip title={editingNotes ? 'Cancel edit' : 'Edit notes'}>
                    <Button size="small" onClick={() => setEditingNotes((v) => !v)}>
                      <Edit2 size={14} />
                    </Button>
                  </Tooltip>
                }
              />
              <CardContent sx={{ pt: 0 }}>
                {editingNotes ? (
                  <TextField
                    multiline rows={4} fullWidth size="small"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Add notes about this customer…"
                  />
                ) : (
                  <Typography variant="body2" color={editNotes ? 'text.primary' : 'text.secondary'}
                    sx={{ minHeight: 60, whiteSpace: 'pre-wrap' }}>
                    {editNotes || 'No notes yet. Click the edit icon to add notes.'}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* ── RIGHT COLUMN — Activity Timeline ─────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%', minHeight: 400 }}>
            <CardHeader title="Activity Timeline" titleTypographyProps={{ variant: 'subtitle1' }}
              subheader={`${activities.length} events recorded`} />
            <CardContent sx={{ pt: 0 }}>
              {activities.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No activity yet.</Typography>
              ) : (
                <List disablePadding>
                  {activities.map((item, idx) => {
                    const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.NOTE;
                    const isLast = idx === activities.length - 1;
                    return (
                      <ListItem key={item.id} disableGutters alignItems="flex-start"
                        sx={{ pb: isLast ? 0 : 1.5, position: 'relative' }}>
                        {/* Connector line */}
                        {!isLast && (
                          <Box sx={{
                            position: 'absolute', left: 13, top: 28, bottom: -6,
                            width: 1, bgcolor: theme.palette.divider,
                          }} />
                        )}
                        <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                          <Box sx={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(meta.color, 0.1), color: meta.color, flexShrink: 0,
                          }}>
                            {meta.icon}
                          </Box>
                        </ListItemIcon>
                        <ListItemText
                          primary={<Typography variant="body2">{item.description}</Typography>}
                          secondary={
                            <Typography variant="caption" color="text.secondary">
                              {fmtDateTime(item.timestamp)} · {timeAgo(item.timestamp)}
                            </Typography>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast(null)}
        message={toast} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />

      {/* ── Create appointment dialog ─────────────────────────────────── */}
      <CreateAppointmentDialog
        open={apptDialogOpen}
        onClose={() => setApptDialogOpen(false)}
        onCreated={(appt) => {
          setToast(`Appointment requested for ${fmtDate(appt.requestedDate)}`);
          setLead((prev) => prev ? { ...prev, status: 'APPOINTMENT_REQUESTED' } : prev);
          setEditStatus('APPOINTMENT_REQUESTED');
        }}
        leadId={lead.leadId}
        dealershipId={lead.dealershipId}
        defaultType="TEST_DRIVE"
      />
    </Box>
  );
};

// ── Reusable sub-components ───────────────────────────────────────────────────
const InfoCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
  return (
    <Card>
      <CardHeader
        title={title}
        titleTypographyProps={{ variant: 'subtitle1' }}
        avatar={<Box sx={{ color: 'primary.main' }}>{icon}</Box>}
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={1}>{children}</Stack>
      </CardContent>
    </Card>
  );
};

const ContactRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}> = ({ icon, label, value, copyable, mono }) => {
  const copy = () => navigator.clipboard.writeText(value);
  return (
    <Stack direction="row" spacing={1} alignItems="flex-start">
      <Box sx={{ color: 'text.secondary', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Tooltip title={copyable ? 'Click to copy' : ''} placement="top">
          <Typography
            variant="body2"
            fontWeight={500}
            fontFamily={mono ? 'monospace' : undefined}
            sx={{
              cursor: copyable ? 'pointer' : 'default',
              wordBreak: 'break-all',
              '&:hover': copyable ? { color: 'primary.main' } : {},
            }}
            onClick={copyable ? copy : undefined}
          >
            {value}
          </Typography>
        </Tooltip>
      </Box>
    </Stack>
  );
};

const ConsentRow: React.FC<{ label: string; granted?: boolean }> = ({ label, granted }) => (
  <Stack direction="row" spacing={1} alignItems="center">
    {granted === true  && <CheckCircle size={14} style={{ color: '#15803D' }} />}
    {granted === false && <XCircle     size={14} style={{ color: '#DC2626' }} />}
    {granted === undefined && <AlertCircle size={14} style={{ color: '#B45309' }} />}
    <Typography variant="body2" color={granted ? 'text.primary' : 'text.secondary'}>
      {label}: <strong>{granted === true ? 'Consented' : granted === false ? 'Not consented' : 'Unknown'}</strong>
    </Typography>
  </Stack>
);
