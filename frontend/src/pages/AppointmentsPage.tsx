import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Skeleton,
  Alert,
  Button,
  useTheme,
  alpha,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
} from '@mui/material';
import {
  CalendarCheck, Clock, MapPin, MoreVertical, Check, X, RotateCcw,
  User, FileText,
} from 'lucide-react';
import { appointmentService } from '@/services/appointmentService';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import type { Appointment, AppointmentStatus, AppointmentType } from '@/services/types';

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  REQUESTED:            { label: 'Requested',     color: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)' },
  PENDING_CONFIRMATION: { label: 'Pending',      color: '#B45309', bg: 'rgba(180, 83, 9, 0.08)' },
  CONFIRMED:            { label: 'Confirmed',     color: '#15803D', bg: 'rgba(21, 128, 61, 0.08)' },
  RESCHEDULED:          { label: 'Rescheduled',   color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)' },
  CANCELLED:            { label: 'Cancelled',     color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)' },
  COMPLETED:            { label: 'Completed',     color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.08)' },
  NO_SHOW:              { label: 'No Show',       color: '#64748B', bg: 'rgba(100, 116, 139, 0.08)' },
};

const TYPE_LABELS: Record<AppointmentType, string> = {
  TEST_DRIVE: 'Test Drive',
  VEHICLE_VIEWING: 'Vehicle Viewing',
  NEGOTIATION: 'Negotiation',
  DELIVERY: 'Delivery',
};

export const AppointmentsPage: React.FC = () => {
  const theme = useTheme();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await appointmentService.list();
        setAppointments(data);
      } catch {
        setError('Failed to load appointments');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleStatusChange = async (appt: Appointment, status: AppointmentStatus) => {
    setMenuAnchor(null);
    try {
      await appointmentService.updateStatus(appt.appointmentId, status);
      setAppointments((prev) =>
        prev.map((a) => (a.appointmentId === appt.appointmentId ? { ...a, status } : a))
      );
    } catch {
      setError('Failed to update appointment status');
    }
  };

  const upcoming = appointments.filter((a) =>
    ['REQUESTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'RESCHEDULED'].includes(a.status)
  );
  const past = appointments.filter((a) =>
    ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CalendarCheck size={24} style={{ color: theme.palette.primary.main }} />
          <Typography variant="h4" fontWeight={700}>Appointments</Typography>
          {!isLoading && (
            <Typography variant="body2" color="text.secondary">
              {upcoming.length} upcoming · {past.length} past
            </Typography>
          )}
        </Stack>
        <Button
          variant="contained"
          startIcon={<CalendarCheck size={16} />}
          onClick={() => setCreateDialogOpen(true)}
        >
          New Appointment
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Summary cards */}
      {!isLoading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Requested</Typography>
              <Typography variant="h5" fontWeight={700} color="#2563EB">
                {appointments.filter((a) => a.status === 'REQUESTED').length}
              </Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Pending</Typography>
              <Typography variant="h5" fontWeight={700} color="#B45309">
                {appointments.filter((a) => a.status === 'PENDING_CONFIRMATION').length}
              </Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Confirmed</Typography>
              <Typography variant="h5" fontWeight={700} color="#15803D">
                {appointments.filter((a) => a.status === 'CONFIRMED').length}
              </Typography>
            </CardContent></Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card><CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="caption" color="text.secondary">Completed</Typography>
              <Typography variant="h5" fontWeight={700} color="#0EA5E9">
                {appointments.filter((a) => a.status === 'COMPLETED').length}
              </Typography>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}

      {/* Upcoming appointments */}
      <Typography variant="overline" sx={{ mb: 1, display: 'block' }}>Upcoming</Typography>
      {isLoading ? (
        <Grid container spacing={2}>{Array.from({ length: 3 }).map((_, i) => (
          <Grid item key={i} xs={12} md={6} lg={4}><Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2 }} /></Grid>
        ))}</Grid>
      ) : upcoming.length === 0 ? (
        <Card><CardContent sx={{ py: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No upcoming appointments.</Typography>
        </CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          {upcoming.map((appt) => (
            <Grid item key={appt.appointmentId} xs={12} md={6} lg={4}>
              <AppointmentCard
                appt={appt}
                onMenuOpen={(e) => { setSelectedAppt(appt); setMenuAnchor(e.currentTarget); }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Past appointments */}
      {past.length > 0 && (
        <>
          <Typography variant="overline" sx={{ mt: 3, mb: 1, display: 'block' }}>Past</Typography>
          <Grid container spacing={2}>
            {past.map((appt) => (
              <Grid item key={appt.appointmentId} xs={12} md={6} lg={4}>
                <AppointmentCard appt={appt} />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* Status change menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {selectedAppt && selectedAppt.status !== 'CONFIRMED' && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'CONFIRMED')}>
            <ListItemIcon><Check size={16} /></ListItemIcon>Confirm
          </MenuItem>
        )}
        {selectedAppt && !['PENDING_CONFIRMATION'].includes(selectedAppt.status) && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'PENDING_CONFIRMATION')}>
            <ListItemIcon><Clock size={16} /></ListItemIcon>Mark Pending
          </MenuItem>
        )}
        {selectedAppt && !['CANCELLED', 'COMPLETED'].includes(selectedAppt.status) && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'RESCHEDULED')}>
            <ListItemIcon><RotateCcw size={16} /></ListItemIcon>Reschedule
          </MenuItem>
        )}
        {selectedAppt && !['CANCELLED', 'COMPLETED'].includes(selectedAppt.status) && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'CANCELLED')}>
            <ListItemIcon><X size={16} /></ListItemIcon>Cancel
          </MenuItem>
        )}
        {selectedAppt && !['COMPLETED', 'CANCELLED'].includes(selectedAppt.status) && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'COMPLETED')}>
            <ListItemIcon><Check size={16} /></ListItemIcon>Mark Completed
          </MenuItem>
        )}
        {selectedAppt && !['NO_SHOW', 'CANCELLED', 'COMPLETED'].includes(selectedAppt.status) && (
          <MenuItem onClick={() => handleStatusChange(selectedAppt, 'NO_SHOW')}>
            <ListItemIcon><X size={16} /></ListItemIcon>Mark No Show
          </MenuItem>
        )}
      </Menu>

      {/* Create appointment dialog */}
      <CreateAppointmentDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onCreated={(appt) => setAppointments((prev) => [appt, ...prev])}
      />
    </Box>
  );
};

// ── Appointment card ──────────────────────────────────────────────────────────
const AppointmentCard: React.FC<{ appt: Appointment; onMenuOpen?: (e: React.MouseEvent<HTMLElement>) => void }> = ({ appt, onMenuOpen }) => {
  const theme = useTheme();
  const statusCfg = STATUS_CONFIG[appt.status];
  const apptDate = new Date(appt.requestedDate);

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(statusCfg.color, 0.08), color: statusCfg.color }}>
              <CalendarCheck size={18} />
            </Box>
            <Box>
              <Typography variant="body1" fontWeight={600}>{TYPE_LABELS[appt.type]}</Typography>
              <Typography variant="caption" color="text.secondary">
                {apptDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at{' '}
                {apptDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={statusCfg.label} size="small" sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: statusCfg.bg, color: statusCfg.color }} />
            {onMenuOpen && (
              <IconButton size="small" onClick={onMenuOpen}>
                <MoreVertical size={16} />
              </IconButton>
            )}
          </Stack>
        </Box>

        <Stack spacing={0.5}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <MapPin size={14} style={{ color: theme.palette.text.secondary }} />
            <Typography variant="caption" color="text.secondary">{appt.location || 'Location TBD'}</Typography>
          </Stack>
          {appt.notes && (
            <Stack direction="row" spacing={0.5} alignItems="flex-start">
              <FileText size={14} style={{ color: theme.palette.text.secondary, marginTop: 2, flexShrink: 0 }} />
              <Typography variant="caption" color="text.secondary">{appt.notes}</Typography>
            </Stack>
          )}
          {appt.confirmedBy && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <User size={14} style={{ color: '#15803D' }} />
              <Typography variant="caption" sx={{ color: '#15803D' }}>
                Confirmed by {appt.confirmedBy}
              </Typography>
            </Stack>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
