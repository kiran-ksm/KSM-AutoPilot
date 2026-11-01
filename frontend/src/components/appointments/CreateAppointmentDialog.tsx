import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Typography, Alert,
  CircularProgress, Box, Divider, useTheme, alpha, Stack,
  IconButton, Tabs, Tab,
} from '@mui/material';
import { CalendarCheck, X, User, Phone, Mail } from 'lucide-react';
import { appointmentService } from '@/services/appointmentService';
import { leadsService } from '@/services/leadsService';
import type { Appointment, AppointmentType } from '@/services/types';

const APPOINTMENT_TYPES: { value: AppointmentType; label: string; description: string }[] = [
  { value: 'TEST_DRIVE',       label: 'Test Drive',        description: 'Drive the vehicle on a pre-agreed route' },
  { value: 'VEHICLE_VIEWING',  label: 'Vehicle Viewing',   description: 'See the vehicle in person at the dealership' },
  { value: 'NEGOTIATION',      label: 'Price Negotiation', description: 'Discuss pricing, trade-in or finance terms' },
  { value: 'DELIVERY',         label: 'Delivery',          description: 'Collect your purchased vehicle' },
];

const TIMESLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00',
];

const DEALERSHIPS = [
  { id: 'dealership-mercedes', name: 'Ray Catena Mercedes-Benz of Edison' },
  { id: 'dealership-toyota',   name: 'Tri-State Toyota' },
  { id: 'dealership-lexus',    name: 'Premier Lexus' },
];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (appointment: Appointment) => void;
  leadId?: string;           // Optional — pre-fills when launched from a lead
  dealershipId?: string;
  defaultType?: AppointmentType;
}

interface FormState {
  leadId: string;
  type: AppointmentType;
  date: string;
  time: string;
  dealershipId: string;
  notes: string;
  // Walk-in / new contact fields (used when no leadId)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export const CreateAppointmentDialog: React.FC<Props> = ({
  open, onClose, onCreated,
  leadId = '', dealershipId = '', defaultType = 'TEST_DRIVE',
}) => {
  const theme = useTheme();
  const hasExistingLead = Boolean(leadId);

  const [tab, setTab] = useState<0 | 1>(0);   // 0 = existing lead, 1 = walk-in / new
  const [form, setForm] = useState<FormState>({
    leadId, type: defaultType, date: '', time: '10:00',
    dealershipId, notes: '',
    firstName: '', lastName: '', email: '', phone: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setForm({
        leadId, type: defaultType, date: '', time: '10:00',
        dealershipId, notes: '',
        firstName: '', lastName: '', email: '', phone: '',
      });
      setError(null);
      setTab(hasExistingLead ? 0 : 1);
    }
  }, [open, leadId, defaultType, dealershipId, hasExistingLead]);

  const set = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  // isValid depends on which tab is active
  const isValid = form.date && form.time && form.dealershipId && (
    tab === 0
      ? Boolean(form.leadId.trim())                                   // existing lead
      : Boolean(form.firstName.trim() && (form.email.trim() || form.phone.trim()))  // new contact
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    try {
      const requestedDate = new Date(`${form.date}T${form.time}:00`).toISOString();
      const dealership = DEALERSHIPS.find((d) => d.id === form.dealershipId);

      // If no existing lead, create a walk-in lead first
      let resolvedLeadId = form.leadId.trim();
      if (tab === 1 || !resolvedLeadId) {
        const newLead = await leadsService.create({
          firstName: form.firstName.trim(),
          lastName:  form.lastName.trim() || 'Unknown',
          email:     form.email.trim() || `walkin+${Date.now()}@ksmautopilot.internal`,
          phone:     form.phone.trim() || '(000) 000-0000',
          source:    'WALK_IN',
          inquiryType: form.type === 'TEST_DRIVE' ? 'TEST_DRIVE' : 'VEHICLE_INFORMATION',
          dealershipId: form.dealershipId || undefined,
          notes: `Walk-in appointment request created on ${new Date().toLocaleDateString()}`,
        });
        resolvedLeadId = newLead.leadId;
      }

      const appt = await appointmentService.create({
        leadId: resolvedLeadId,
        type: form.type,
        requestedDate,
        timezone: 'America/New_York',
        location: dealership?.name ?? form.dealershipId,
        notes: form.notes.trim() || undefined,
      });
      onCreated(appt);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create appointment.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
              <CalendarCheck size={20} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={700}>Request Appointment</Typography>
              <Typography variant="caption" color="text.secondary">
                Not confirmed until the dealership accepts
              </Typography>
            </Box>
          </Stack>
          <IconButton size="small" onClick={onClose}><X size={18} /></IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      {/* Tab: existing lead vs walk-in — only shown when dialog opened without a leadId */}
      {!hasExistingLead && (
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3 }}>
          <Tab label="Existing Lead" value={0} />
          <Tab label="Walk-in / New Contact" value={1} />
        </Tabs>
      )}

      <DialogContent sx={{ pt: 2 }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" id="appt-form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>

            {/* Tab 0: link to existing lead */}
            {!hasExistingLead && tab === 0 && (
              <Grid item xs={12}>
                <TextField
                  label="Lead ID"
                  fullWidth
                  value={form.leadId}
                  onChange={set('leadId')}
                  helperText="Paste the lead ID from the Leads page — leave blank to create a new contact"
                  placeholder="e.g. ec3b9ff7-898b-4776-… (optional)"
                  InputProps={{ startAdornment: <User size={14} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
                />
              </Grid>
            )}

            {/* Tab 1: walk-in / new contact */}
            {tab === 1 && (
              <>
                <Grid item xs={12} sm={6}>
                  <TextField label="First name" required fullWidth value={form.firstName} onChange={set('firstName')} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Last name" fullWidth value={form.lastName} onChange={set('lastName')} placeholder="Optional" />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={form.email}
                    onChange={set('email')}
                    helperText="Email or phone required"
                    InputProps={{ startAdornment: <Mail size={14} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Phone"
                    type="tel"
                    fullWidth
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="(XXX) XXX-XXXX"
                    InputProps={{ startAdornment: <Phone size={14} style={{ marginRight: 8, color: theme.palette.text.secondary }} /> }}
                  />
                </Grid>
              </>
            )}

            {/* Shared fields */}
            <Grid item xs={12}>
              <TextField select label="Appointment type" required fullWidth value={form.type} onChange={set('type')}>
                {APPOINTMENT_TYPES.map((t) => (
                  <MenuItem key={t.value} value={t.value}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>{t.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.description}</Typography>
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Preferred date" type="date" required fullWidth
                InputLabelProps={{ shrink: true }} inputProps={{ min: today }}
                value={form.date} onChange={set('date')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select label="Preferred time" required fullWidth value={form.time} onChange={set('time')}>
                {TIMESLOTS.map((t) => (
                  <MenuItem key={t} value={t}>
                    {new Date(`2000-01-01T${t}:00`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField select label="Dealership location" required fullWidth value={form.dealershipId} onChange={set('dealershipId')}>
                <MenuItem value=""><em>Select a location</em></MenuItem>
                {DEALERSHIPS.map((d) => (<MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes (optional)" multiline rows={2} fullWidth
                value={form.notes} onChange={set('notes')}
                placeholder="e.g. Interested in comparing two models, prefer afternoon…"
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2, fontSize: '0.75rem' }}>
            This is a <strong>request</strong> — not a confirmed appointment. The dealership will confirm or propose an alternative time.
            {tab === 1 && ' A new lead record will be created automatically for this walk-in contact.'}
          </Alert>
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined" disabled={submitting}>Cancel</Button>
        <Button
          type="submit" form="appt-form" variant="contained"
          disabled={submitting || !isValid}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : <CalendarCheck size={16} />}
        >
          {submitting ? 'Requesting…' : 'Request Appointment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
