import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  MenuItem,
  Grid,
  Stepper,
  Step,
  StepLabel,
  FormControlLabel,
  Checkbox,
  Stack,
  Divider,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useForm, Controller } from 'react-hook-form';
import { leadsService } from '@/services/leadsService';
import type { CreateLeadRequest, InquiryType, ContactMethod, ChannelConsent, LeadAttribution } from '@/services/types';

const INQUIRY_TYPES: { value: InquiryType; label: string }[] = [
  { value: 'VEHICLE_INFORMATION', label: 'Vehicle Information' },
  { value: 'TEST_DRIVE', label: 'Test Drive' },
  { value: 'AVAILABILITY', label: 'Availability' },
  { value: 'TRADE_IN', label: 'Trade-In' },
  { value: 'FINANCING', label: 'Financing Information' },
  { value: 'GENERAL_QUESTION', label: 'General Question' },
];

const CONTACT_METHODS: { value: ContactMethod; label: string }[] = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone Call' },
  { value: 'SMS', label: 'Text Message' },
  { value: 'ANY', label: 'Any Method' },
];

const VEHICLE_MAKES = [
  'Mercedes-Benz', 'BMW', 'Audi', 'Lexus', 'Toyota', 'Honda', 'Ford',
  'Chevrolet', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Volkswagen', 'Other',
];

interface LeadForm extends CreateLeadRequest {
  consentEmail: boolean;
  consentSms: boolean;
  consentPhone: boolean;
}

export const LeadFormPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Capture UTM attribution from URL on mount
  const [attribution] = useState<LeadAttribution>(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      utmSource: params.get('utm_source') || undefined,
      utmMedium: params.get('utm_medium') || undefined,
      utmCampaign: params.get('utm_campaign') || undefined,
      utmContent: params.get('utm_content') || undefined,
      utmTerm: params.get('utm_term') || undefined,
      landingPageUrl: window.location.href.split('?')[0],
      referrerUrl: document.referrer || undefined,
    };
  });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<LeadForm>({
    defaultValues: {
      inquiryType: 'VEHICLE_INFORMATION',
      preferredContactMethod: 'EMAIL',
      consentEmail: true,
      consentSms: false,
      consentPhone: false,
    },
  });

  const onSubmit = async (data: LeadForm) => {
    setApiError(null);
    try {
      const consent: ChannelConsent = {
        email: data.consentEmail,
        sms: data.consentSms,
        phone: data.consentPhone,
      };
      // At least one contact method must be consented
      if (!consent.email && !consent.sms && !consent.phone) {
        setApiError('Please provide consent for at least one contact method.');
        return;
      }
      const payload: CreateLeadRequest = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        inquiryType: data.inquiryType,
        vehicleInterest: data.vehicleInterest,
        message: data.message,
        preferredContactMethod: data.preferredContactMethod,
        preferredContactTime: data.preferredContactTime,
        consent,
        source: 'WEBSITE',
        attribution,
      };
      await leadsService.create(payload);
      setSubmitted(true);
    } catch (err: unknown) {
      setApiError(
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    }
  };

  if (submitted) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} gutterBottom>
              Thank you!
            </Typography>
            <Typography color="text.secondary">
              Your enquiry has been received. One of our team members will be in touch shortly.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  const selectedInquiry = watch('inquiryType');
  const showVehicleFields = selectedInquiry !== 'GENERAL_QUESTION' && selectedInquiry !== 'FINANCING';

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'center',
        p: 2,
        pt: { xs: 4, sm: 2 },
        overflowX: 'hidden',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 640 }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <DirectionsCarIcon color="primary" sx={{ fontSize: 24 }} />
            <Typography variant="h6" fontWeight={600} color="primary.main">
              KSM AutoPilot
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Request a Callback
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Fill in your details and we'll get back to you as soon as possible.
          </Typography>

          <Stepper activeStep={0} sx={{ mb: 3, display: { xs: 'none', sm: 'flex' } }}>
            <Step><StepLabel>Your Details</StepLabel></Step>
            <Step><StepLabel>Vehicle Interest</StepLabel></Step>
            <Step><StepLabel>Confirmation</StepLabel></Step>
          </Stepper>

          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* ── Contact details ─────────────────────────────────── */}
            <Typography variant="overline" sx={{ display: 'block', mb: 1 }}>Your Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="First name"
                  fullWidth
                  error={!!errors.firstName}
                  helperText={errors.firstName?.message}
                  {...register('firstName', { required: 'First name is required' })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Last name"
                  fullWidth
                  error={!!errors.lastName}
                  helperText={errors.lastName?.message}
                  {...register('lastName', { required: 'Last name is required' })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Email address"
                  type="email"
                  fullWidth
                  error={!!errors.email}
                  helperText={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /\S+@\S+\.\S+/, message: 'Enter a valid email' },
                  })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone number"
                  type="tel"
                  fullWidth
                  error={!!errors.phone}
                  helperText={errors.phone?.message ?? 'Format: (XXX) XXX-XXXX'}
                  {...register('phone', {
                    required: 'Phone is required',
                    pattern: {
                      value: /^(\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,
                      message: 'Enter a valid US phone number',
                    },
                  })}
                />
              </Grid>
            </Grid>

            {/* ── Inquiry details ─────────────────────────────────── */}
            <Typography variant="overline" sx={{ display: 'block', mt: 3, mb: 1 }}>Inquiry Details</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Inquiry type"
                  fullWidth
                  defaultValue="VEHICLE_INFORMATION"
                  {...register('inquiryType')}
                >
                  {INQUIRY_TYPES.map((t) => (
                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  label="Preferred contact method"
                  fullWidth
                  defaultValue="EMAIL"
                  {...register('preferredContactMethod')}
                >
                  {CONTACT_METHODS.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Preferred contact time (optional)"
                  fullWidth
                  placeholder="e.g. Weekday mornings, weekends, after 5pm"
                  {...register('preferredContactTime')}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Message (optional)"
                  multiline
                  rows={3}
                  fullWidth
                  placeholder="Tell us what you're looking for..."
                  {...register('message')}
                />
              </Grid>
            </Grid>

            {/* ── Vehicle interest ────────────────────────────────── */}
            {showVehicleFields && (
              <>
                <Typography variant="overline" sx={{ display: 'block', mt: 3, mb: 1 }}>Vehicle Interest</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      label="Year"
                      type="number"
                      fullWidth
                      inputProps={{ min: 1990, max: 2030 }}
                      {...register('vehicleInterest.year')}
                    />
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <TextField
                      select
                      label="Make"
                      fullWidth
                      defaultValue=""
                      {...register('vehicleInterest.make')}
                    >
                      <MenuItem value="">Any</MenuItem>
                      {VEHICLE_MAKES.map((m) => (
                        <MenuItem key={m} value={m}>{m}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Model"
                      fullWidth
                      placeholder="e.g. C-Class, X5, Camry"
                      {...register('vehicleInterest.model')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Trim (optional)"
                      fullWidth
                      placeholder="e.g. Premium, Sport, Limited"
                      {...register('vehicleInterest.trim')}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="VIN or Stock # (optional)"
                      fullWidth
                      placeholder="e.g. WDDZF4JB1HA123456"
                      {...register('vehicleInterest.vin')}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {/* ── Consent ─────────────────────────────────────────── */}
            <Typography variant="overline" sx={{ display: 'block', mt: 3, mb: 1 }}>Communication Consent</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Please select how you'd like us to contact you. At least one is required.
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <FormControlLabel
                control={<Controller name="consentEmail" control={control} render={({ field }) => <Checkbox {...field} checked={field.value} />} />}
                label="Email"
              />
              <FormControlLabel
                control={<Controller name="consentSms" control={control} render={({ field }) => <Checkbox {...field} checked={field.value} />} />}
                label="SMS / Text"
              />
              <FormControlLabel
                control={<Controller name="consentPhone" control={control} render={({ field }) => <Checkbox {...field} checked={field.value} />} />}
                label="Phone Call"
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isSubmitting}
              sx={{ py: 1.5 }}
            >
              {isSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Submit Enquiry'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};
