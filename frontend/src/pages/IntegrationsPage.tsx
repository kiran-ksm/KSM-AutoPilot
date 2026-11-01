import React from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CardHeader,
  Chip, Stack, Alert, Divider, List, ListItem, ListItemText,
  ListItemIcon, useTheme, alpha,
} from '@mui/material';
import {
  Plug, CheckCircle, XCircle, AlertTriangle, Clock,
  RefreshCw, Database, MessageSquare, Mail, Phone,
  Calendar, Car, Users, Settings,
} from 'lucide-react';

type IntegrationStatus = 'CONNECTED' | 'SIMULATED' | 'DISCONNECTED' | 'DEGRADED' | 'NOT_CONFIGURED';

interface Integration {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  description: string;
  lastSync?: string;
  notes: string;
  phase: string;
}

const INTEGRATIONS: Integration[] = [
  // Phase 2 — implemented
  {
    id: 'dynamodb',
    name: 'DynamoDB',
    category: 'Database',
    status: 'CONNECTED',
    description: 'Single-table lead and activity storage',
    lastSync: new Date().toISOString(),
    notes: 'Operational. Single-table design with GSI1 for status queries.',
    phase: 'Phase 2',
  },
  {
    id: 'cognito',
    name: 'Amazon Cognito',
    category: 'Authentication',
    status: 'CONNECTED',
    description: 'User pool for salesperson authentication',
    lastSync: new Date().toISOString(),
    notes: 'Operational. Custom attributes: tenantId, role. Self sign-up disabled.',
    phase: 'Phase 2',
  },
  {
    id: 'bedrock',
    name: 'Amazon Bedrock',
    category: 'AI',
    status: 'CONNECTED',
    description: 'AI lead scoring and customer summaries via Claude',
    lastSync: new Date().toISOString(),
    notes: 'Operational. Guardrails configured. Model: Claude 3 Sonnet. Invoked on-demand.',
    phase: 'Phase 3',
  },
  // Phase 4 — demo mode
  {
    id: 'sms',
    name: 'SMS (SNS / Pinpoint)',
    category: 'Messaging',
    status: 'SIMULATED',
    description: 'Outbound SMS messages to leads',
    notes: 'DEMO_MODE=true. No real messages sent. Payloads logged to Demo Console. Real provider requires production enablement.',
    phase: 'Phase 4',
  },
  {
    id: 'email',
    name: 'Email (SES)',
    category: 'Messaging',
    status: 'SIMULATED',
    description: 'Outbound email to leads from info@ksmtechnologies.net',
    notes: 'DEMO_MODE=true. No real emails sent. From address: info@ksmtechnologies.net. SES domain verification required for production.',
    phase: 'Phase 4',
  },
  // Phase 5 — not implemented
  {
    id: 'crm',
    name: 'CRM (VinSolutions / DealerSocket)',
    category: 'CRM/DMS',
    status: 'NOT_CONFIGURED',
    description: 'Bi-directional lead synchronization with dealership CRM',
    notes: 'Phase 5 — not implemented. CRMProvider interface defined. Requires vendor API credentials, field mapping, and webhook configuration. Do not assume any specific vendor is selected.',
    phase: 'Phase 5',
  },
  {
    id: 'dms',
    name: 'DMS (CDK / Reynolds)',
    category: 'CRM/DMS',
    status: 'NOT_CONFIGURED',
    description: 'Dealer Management System integration for inventory and deal records',
    notes: 'Phase 5 — not implemented. Requires authorized DMS API access and approved data sharing agreement.',
    phase: 'Phase 5',
  },
  {
    id: 'inventory',
    name: 'Inventory Feed',
    category: 'Inventory',
    status: 'SIMULATED',
    description: 'Vehicle inventory from dealership DMS or approved feed',
    notes: 'Mock adapter active. 15 synthetic vehicles across 3 demo dealerships. InventoryProvider interface defined for real feed replacement.',
    phase: 'Phase 5',
  },
  {
    id: 'telephony',
    name: 'Telephony / AI Voice Agent',
    category: 'Phone',
    status: 'NOT_CONFIGURED',
    description: 'Inbound call handling, missed-call callbacks, AI voice agent',
    notes: 'Phase 5 / §6.3 — not implemented. Requires authorized telephony provider (e.g. Twilio, Amazon Connect). Recording/transcription needs dealership-approved notice and consent policy.',
    phase: 'Phase 5',
  },
  {
    id: 'chat',
    name: 'Website Chat / Inbound Messages',
    category: 'Messaging',
    status: 'NOT_CONFIGURED',
    description: 'Inbound SMS, chat, and email channel routing',
    notes: 'Phase 5 / §6.3 — not implemented. Each channel requires a verified provider adapter. Do not assume any integration exists until validated.',
    phase: 'Phase 5',
  },
  {
    id: 'calendar',
    name: 'Calendar / Appointment Confirmation',
    category: 'Appointments',
    status: 'NOT_CONFIGURED',
    description: 'External calendar for appointment availability and confirmation',
    notes: 'Phase 5 — not implemented. Appointment requests are stored but require manual confirmation by a salesperson. No double-booking prevention without calendar integration.',
    phase: 'Phase 5',
  },
  {
    id: 'campaigns',
    name: 'Outbound Campaigns',
    category: 'Marketing',
    status: 'NOT_CONFIGURED',
    description: 'Authorized prospect outreach and campaign management (§9.3)',
    notes: 'Phase 5 / §9.3 — not implemented. MVP requires human review and approval before any outbound campaign. Requires approved templates, audience rules, opt-in validation, quiet hours, and audit logs per tenant.',
    phase: 'Phase 5',
  },
];

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  CONNECTED:      { label: 'Connected',      color: '#15803D', bg: 'rgba(21,128,61,0.08)',   icon: <CheckCircle size={14} /> },
  SIMULATED:      { label: 'Simulated',      color: '#B45309', bg: 'rgba(180,83,9,0.08)',    icon: <AlertTriangle size={14} /> },
  DEGRADED:       { label: 'Degraded',       color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   icon: <AlertTriangle size={14} /> },
  DISCONNECTED:   { label: 'Disconnected',   color: '#DC2626', bg: 'rgba(220,38,38,0.08)',   icon: <XCircle size={14} /> },
  NOT_CONFIGURED: { label: 'Not Configured', color: '#64748B', bg: 'rgba(100,116,139,0.08)', icon: <Clock size={14} /> },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Database:       <Database size={18} />,
  Authentication: <Users size={18} />,
  AI:             <Settings size={18} />,
  Messaging:      <MessageSquare size={18} />,
  'CRM/DMS':      <Plug size={18} />,
  Inventory:      <Car size={18} />,
  Phone:          <Phone size={18} />,
  Appointments:   <Calendar size={18} />,
  Marketing:      <Mail size={18} />,
};

export const IntegrationsPage: React.FC = () => {
  const theme = useTheme();

  const summary = {
    connected:     INTEGRATIONS.filter((i) => i.status === 'CONNECTED').length,
    simulated:     INTEGRATIONS.filter((i) => i.status === 'SIMULATED').length,
    notConfigured: INTEGRATIONS.filter((i) => i.status === 'NOT_CONFIGURED').length,
  };

  const byPhase = INTEGRATIONS.reduce<Record<string, Integration[]>>((acc, i) => {
    (acc[i.phase] ??= []).push(i);
    return acc;
  }, {});

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Plug size={24} style={{ color: theme.palette.primary.main }} />
        <Typography variant="h4" fontWeight={700}>Integration Status</Typography>
      </Stack>

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Demo environment.</strong> Integrations marked "Simulated" use mock adapters. No real third-party APIs are called.
        Integrations marked "Not Configured" are planned for Phase 5 and require vendor access and authorization before implementation.
      </Alert>

      {/* Summary chips */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Chip icon={<CheckCircle size={14} />} label={`${summary.connected} Connected`} sx={{ bgcolor: 'rgba(21,128,61,0.08)', color: '#15803D', fontWeight: 600 }} />
        <Chip icon={<AlertTriangle size={14} />} label={`${summary.simulated} Simulated`} sx={{ bgcolor: 'rgba(180,83,9,0.08)', color: '#B45309', fontWeight: 600 }} />
        <Chip icon={<Clock size={14} />} label={`${summary.notConfigured} Not Configured`} sx={{ bgcolor: 'rgba(100,116,139,0.08)', color: '#64748B', fontWeight: 600 }} />
      </Stack>

      {Object.entries(byPhase).map(([phase, items]) => (
        <Box key={phase} sx={{ mb: 3 }}>
          <Typography variant="overline" sx={{ display: 'block', mb: 1.5, color: 'text.secondary' }}>
            {phase}
          </Typography>
          <Grid container spacing={2}>
            {items.map((integration) => {
              const cfg = STATUS_CONFIG[integration.status];
              return (
                <Grid item xs={12} md={6} key={integration.id}>
                  <Card>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={1.5} alignItems="flex-start" justifyContent="space-between">
                        <Stack direction="row" spacing={1.5} alignItems="flex-start">
                          <Box sx={{ p: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.08), color: 'primary.main' }}>
                            {CATEGORY_ICONS[integration.category] ?? <Plug size={18} />}
                          </Box>
                          <Box>
                            <Typography variant="body1" fontWeight={700}>{integration.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{integration.description}</Typography>
                          </Box>
                        </Stack>
                        <Chip
                          icon={cfg.icon as React.ReactElement}
                          label={cfg.label}
                          size="small"
                          sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600, fontSize: '0.65rem', flexShrink: 0 }}
                        />
                      </Stack>

                      <Divider sx={{ my: 1.5 }} />

                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.6 }}>
                        {integration.notes}
                      </Typography>

                      {integration.lastSync && (
                        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
                          <RefreshCw size={11} style={{ color: theme.palette.text.secondary }} />
                          <Typography variant="caption" color="text.secondary">
                            Last sync: {new Date(integration.lastSync).toLocaleString()}
                          </Typography>
                        </Stack>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      ))}

      <Card sx={{ mt: 2 }}>
        <CardHeader title="Adding a Real Integration" titleTypographyProps={{ variant: 'subtitle1' }} />
        <CardContent sx={{ pt: 0 }}>
          <List dense>
            {[
              'Each integration is implemented behind a provider interface (CRMProvider, InventoryProvider, etc.)',
              'To connect a real vendor, replace the mock adapter without changing business logic or UI',
              'Store credentials in AWS Secrets Manager — never in source control or environment variables',
              'Test the integration in dev → staging before enabling in production',
              'Document field mapping, conflict resolution, retry policy, and webhook signature verification',
              'Obtain written authorization from the dealership before connecting any live system',
            ].map((step, i) => (
              <ListItem key={i} disableGutters>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <Typography variant="caption" fontWeight={700} color="primary.main">{i + 1}.</Typography>
                </ListItemIcon>
                <ListItemText primary={<Typography variant="caption">{step}</Typography>} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};
