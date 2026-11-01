import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  IconButton,
  useTheme,
  alpha,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  FormControlLabel,
  Checkbox,
  Grid,
} from '@mui/material';
import { X, MapPin, Gauge, BadgeCheck, Clock, Car, Send, Calendar, Phone } from 'lucide-react';
import type { InventoryVehicle } from '@/services/types';
import { leadsService } from '@/services/leadsService';

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:      { bg: 'rgba(37, 99, 235, 0.08)',  text: '#2563EB' },
  CERTIFIED:{ bg: 'rgba(21, 128, 61, 0.08)',  text: '#15803D' },
  USED:     { bg: 'rgba(180, 83, 9, 0.08)',   text: '#B45309' },
};

const AVAILABILITY_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  AVAILABLE: { bg: 'rgba(21, 128, 61, 0.08)',  text: '#15803D', label: 'Available' },
  RESERVED:  { bg: 'rgba(180, 83, 9, 0.08)',   text: '#B45309', label: 'Reserved' },
  SOLD:      { bg: 'rgba(220, 38, 38, 0.08)',  text: '#DC2626', label: 'Sold'      },
  IN_TRANSIT:{ bg: 'rgba(14, 165, 233, 0.08)', text: '#0EA5E9', label: 'In Transit' },
};

interface EnquiryForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  inquiryType: 'TEST_DRIVE' | 'VEHICLE_INFORMATION' | 'AVAILABILITY' | 'FINANCING';
  message: string;
  consentEmail: boolean;
  consentSms: boolean;
}

interface Props {
  vehicle: InventoryVehicle | null;
  open: boolean;
  onClose: () => void;
}

export const VehicleDetailDrawer: React.FC<Props> = ({ vehicle, open, onClose }) => {
  const theme = useTheme();
  const [tab, setTab] = useState<'details' | 'enquire'>('details');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EnquiryForm>({
    firstName: '', lastName: '', email: '', phone: '',
    inquiryType: 'VEHICLE_INFORMATION', message: '',
    consentEmail: true, consentSms: false,
  });

  const handleClose = () => {
    setTab('details');
    setSubmitted(false);
    setError(null);
    onClose();
  };

  const handleChange = (field: keyof EnquiryForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle) return;
    if (!form.consentEmail && !form.consentSms) {
      setError('Please allow at least one contact method.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await leadsService.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        inquiryType: form.inquiryType,
        message: form.message || `I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model} (Stock: ${vehicle.stockNumber}).`,
        source: 'WEBSITE',
        dealershipId: vehicle.dealershipId,
        vehicleInterest: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim,
          vin: vehicle.vin,
          stockNumber: vehicle.stockNumber,
          vehicleDetailUrl: vehicle.vehicleDetailUrl,
        },
        consent: { email: form.consentEmail, sms: form.consentSms, phone: false },
        attribution: {
          utmSource: 'inventory_browser',
          utmMedium: 'kiosk',
          landingPageUrl: window.location.href,
        },
      });
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!vehicle) return null;

  const condColor = CONDITION_COLORS[vehicle.condition] ?? CONDITION_COLORS.USED;
  const availColor = AVAILABILITY_COLORS[vehicle.availabilityStatus] ?? AVAILABILITY_COLORS.AVAILABLE;
  const syncHoursAgo = Math.round((Date.now() - new Date(vehicle.lastSyncedAt).getTime()) / 3600000);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      PaperProps={{ sx: { width: { xs: '100vw', sm: 480 }, display: 'flex', flexDirection: 'column' } }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" fontWeight={700}>{vehicle.year} {vehicle.make} {vehicle.model}</Typography>
        <IconButton onClick={handleClose} size="small"><X size={20} /></IconButton>
      </Box>

      {/* Tab selector */}
      <Stack direction="row" sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
        {(['details', 'enquire'] as const).map((t) => (
          <Button
            key={t}
            onClick={() => setTab(t)}
            sx={{
              flex: 1, borderRadius: 0, py: 1.5, fontWeight: 600,
              color: tab === t ? 'primary.main' : 'text.secondary',
              borderBottom: tab === t ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
            }}
          >
            {t === 'details' ? 'Vehicle Details' : 'Enquire / Book'}
          </Button>
        ))}
      </Stack>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5 }}>
        {tab === 'details' ? (
          <VehicleDetails vehicle={vehicle} condColor={condColor} availColor={availColor} syncHoursAgo={syncHoursAgo} onEnquire={() => setTab('enquire')} />
        ) : submitted ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <BadgeCheck size={56} style={{ color: '#15803D', marginBottom: 12 }} />
            <Typography variant="h6" fontWeight={700} gutterBottom>Enquiry Received!</Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              We'll be in touch about the {vehicle.year} {vehicle.make} {vehicle.model} shortly.
            </Typography>
            <Button variant="outlined" onClick={handleClose}>Close</Button>
          </Box>
        ) : (
          <EnquiryFormPanel
            vehicle={vehicle}
            form={form}
            onChange={handleChange}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}
      </Box>
    </Drawer>
  );
};

// ── Vehicle details panel ─────────────────────────────────────────────────────
const VehicleDetails: React.FC<{
  vehicle: InventoryVehicle;
  condColor: { bg: string; text: string };
  availColor: { bg: string; text: string; label: string };
  syncHoursAgo: number;
  onEnquire: () => void;
}> = ({ vehicle, condColor, availColor, syncHoursAgo, onEnquire }) => {
  const theme = useTheme();
  const isFresh = syncHoursAgo < 2;

  return (
    <Stack spacing={2.5}>
      {/* Image */}
      <Box
        component="img"
        src={vehicle.imageUrl}
        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        sx={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.04) }}
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />

      {/* Price */}
      <Box>
        <Typography variant="h4" fontWeight={700} color="primary.main">
          {vehicle.price > 0 ? `$${vehicle.price.toLocaleString()}` : 'Price on Request'}
        </Typography>
        <Typography variant="body2" color="text.secondary">{vehicle.trim}</Typography>
      </Box>

      {/* Status chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
        <Chip label={vehicle.condition} size="small" sx={{ fontWeight: 600, bgcolor: condColor.bg, color: condColor.text }} />
        <Chip label={availColor.label} size="small" sx={{ fontWeight: 600, bgcolor: availColor.bg, color: availColor.text }} />
      </Stack>

      <Divider />

      {/* Specs */}
      <Stack spacing={1.5}>
        <SpecRow icon={<Gauge size={16} />} label="Mileage" value={vehicle.mileage ? `${vehicle.mileage.toLocaleString()} miles` : 'New — 0 miles'} />
        <SpecRow icon={<Car size={16} />} label="VIN" value={vehicle.vin} mono />
        <SpecRow icon={<Car size={16} />} label="Stock #" value={vehicle.stockNumber} mono />
        {vehicle.exteriorColor && <SpecRow icon={<Car size={16} />} label="Exterior" value={vehicle.exteriorColor} />}
        {vehicle.interiorColor && <SpecRow icon={<Car size={16} />} label="Interior" value={vehicle.interiorColor} />}
        <SpecRow icon={<MapPin size={16} />} label="Dealership" value={vehicle.dealershipName} />
        <SpecRow
          icon={isFresh ? <BadgeCheck size={16} /> : <Clock size={16} />}
          label="Availability"
          value={isFresh ? 'Verified recently' : `Cached — synced ${syncHoursAgo}h ago`}
          valueColor={isFresh ? '#15803D' : '#B45309'}
        />
      </Stack>

      <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
        <strong>Demo Data.</strong> Availability is simulated. Contact the dealership to confirm real-time stock.
      </Alert>

      {/* Actions */}
      <Stack spacing={1.5}>
        <Button variant="contained" size="large" startIcon={<Send size={18} />} onClick={onEnquire} fullWidth>
          Enquire About This Vehicle
        </Button>
        <Button variant="outlined" size="large" startIcon={<Calendar size={18} />} onClick={onEnquire} fullWidth>
          Request a Test Drive
        </Button>
        <Button variant="text" size="small" startIcon={<Phone size={14} />} fullWidth>
          Call Dealership
        </Button>
      </Stack>
    </Stack>
  );
};

const SpecRow: React.FC<{ icon: React.ReactNode; label: string; value: string; mono?: boolean; valueColor?: string }> = ({ icon, label, value, mono, valueColor }) => {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Box sx={{ color: 'text.secondary', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
        <Typography variant="body2" fontWeight={500} fontFamily={mono ? 'monospace' : undefined} sx={{ color: valueColor ?? 'text.primary' }}>
          {value}
        </Typography>
      </Box>
    </Stack>
  );
};

// ── Enquiry form panel ────────────────────────────────────────────────────────
const EnquiryFormPanel: React.FC<{
  vehicle: InventoryVehicle;
  form: EnquiryForm;
  onChange: (field: keyof EnquiryForm) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  error: string | null;
}> = ({ vehicle, form, onChange, onSubmit, submitting, error }) => (
  <Box component="form" onSubmit={onSubmit} noValidate>
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Enquiring about: <strong>{vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}</strong> · Stock {vehicle.stockNumber}
    </Typography>

    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

    <Grid container spacing={2}>
      <Grid item xs={6}>
        <TextField label="First name" required fullWidth value={form.firstName} onChange={onChange('firstName')} />
      </Grid>
      <Grid item xs={6}>
        <TextField label="Last name" required fullWidth value={form.lastName} onChange={onChange('lastName')} />
      </Grid>
      <Grid item xs={12}>
        <TextField label="Email" type="email" required fullWidth value={form.email} onChange={onChange('email')} />
      </Grid>
      <Grid item xs={12}>
        <TextField label="Phone" type="tel" required fullWidth value={form.phone} onChange={onChange('phone')} helperText="Format: (XXX) XXX-XXXX" />
      </Grid>
      <Grid item xs={12}>
        <TextField select label="Inquiry type" fullWidth value={form.inquiryType} onChange={onChange('inquiryType') as any}>
          <MenuItem value="VEHICLE_INFORMATION">Vehicle Information</MenuItem>
          <MenuItem value="TEST_DRIVE">Test Drive</MenuItem>
          <MenuItem value="AVAILABILITY">Availability Check</MenuItem>
          <MenuItem value="FINANCING">Financing Options</MenuItem>
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField label="Message (optional)" multiline rows={3} fullWidth value={form.message} onChange={onChange('message')}
          placeholder={`I'm interested in the ${vehicle.year} ${vehicle.make} ${vehicle.model}...`} />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>Contact me by:</Typography>
        <Stack direction="row" spacing={1}>
          <FormControlLabel control={<Checkbox checked={form.consentEmail} onChange={onChange('consentEmail') as any} size="small" />} label="Email" />
          <FormControlLabel control={<Checkbox checked={form.consentSms} onChange={onChange('consentSms') as any} size="small" />} label="SMS" />
        </Stack>
      </Grid>
    </Grid>

    <Button type="submit" variant="contained" fullWidth size="large" sx={{ mt: 2 }} disabled={submitting || !form.firstName || !form.lastName || !form.email || !form.phone}>
      {submitting ? <CircularProgress size={20} color="inherit" /> : 'Submit Enquiry'}
    </Button>
  </Box>
);
