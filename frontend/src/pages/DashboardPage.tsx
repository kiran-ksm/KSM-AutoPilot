import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Button,
  Alert,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Skeleton,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import { RefreshCw, Users, Flame, Clock, TrendingUp, UserPlus, CalendarClock } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/dashboard/StatCard';
import { STATUS_CONFIG } from '@/components/leads/LeadStatusChip';
import { PriorityChip } from '@/components/leads/PriorityChip';
import { useDashboard } from '@/hooks/useDashboard';
import type { LeadsBySourceItem, ActivityItem, FollowUpItem, SalespersonPerformance } from '@/services/types';

const SOURCE_COLORS: Record<string, string> = {
  WEBSITE: '#2563EB',
  WALK_IN: '#0EA5E9',
  REFERRAL: '#7C3AED',
  SOCIAL: '#B45309',
  OTHER: '#64748B',
};

export const DashboardPage: React.FC = () => {
  const {
    stats,
    leadsByStatus,
    leadsBySource,
    recentActivity,
    followUpQueue,
    salespersonPerformance,
    isLoading,
    error,
    refetch,
  } = useDashboard();
  const theme = useTheme();

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>
          Dashboard
        </Typography>
        <Button
          startIcon={<RefreshCw size={16} />}
          onClick={refetch}
          variant="outlined"
          size="small"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* KPI stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="Total Leads" value={stats?.totalLeads ?? 0} icon={Users} color="#2563EB" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="New Leads" value={stats?.newLeads ?? 0} icon={UserPlus} color="#0EA5E9" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="Hot Leads" value={stats?.hotLeads ?? 0} subtitle={`${stats?.warmLeads ?? 0} warm`} icon={Flame} color="#DC2626" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="Awaiting Response" value={stats?.awaitingResponse ?? 0} icon={Clock} color="#B45309" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="Follow-ups Due" value={stats?.followUpsDueToday ?? 0} subtitle={`${stats?.followUpsOverdue ?? 0} overdue`} icon={CalendarClock} color="#7C3AED" loading={isLoading} />
        </Grid>
        <Grid item xs={6} md={4} lg={2}>
          <StatCard title="Conversion" value={stats ? `${stats.conversionRate}%` : '—'} subtitle={`${stats?.wonThisMonth ?? 0} won`} icon={TrendingUp} color="#15803D" loading={isLoading} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Leads by status chart */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardHeader title="Leads by Status" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box sx={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={leadsByStatus} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <XAxis dataKey="status" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ')} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <RTooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {leadsByStatus.map((entry) => (
                          <Cell key={entry.status} fill={STATUS_CONFIG[entry.status]?.dot ?? '#2563EB'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Lead source breakdown */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardHeader title="Lead Source Breakdown" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent>
              {isLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : leadsBySource.length === 0 ? (
                <EmptyState text="No lead source data available" />
              ) : (
                <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {leadsBySource.map((entry: LeadsBySourceItem) => (
                          <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] ?? '#64748B'} />
                        ))}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
              {/* Source legend */}
              {!isLoading && leadsBySource.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1, justifyContent: 'center' }}>
                  {leadsBySource.map((s) => (
                    <Chip
                      key={s.source}
                      label={`${s.source.charAt(0) + s.source.slice(1).toLowerCase().replace('_', ' ')}: ${s.count}`}
                      size="small"
                      sx={{ fontSize: '0.68rem', bgcolor: alpha(SOURCE_COLORS[s.source] ?? '#64748B', 0.08), color: SOURCE_COLORS[s.source] ?? '#64748B', fontWeight: 600 }}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Priority follow-up queue */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Priority Follow-up Queue" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />)
              ) : followUpQueue.length === 0 ? (
                <EmptyState text="No pending follow-ups" />
              ) : (
                <List dense disablePadding>
                  {followUpQueue.slice(0, 6).map((item: FollowUpItem) => (
                    <ListItem
                      key={item.leadId}
                      disableGutters
                      sx={{ py: 0.75, borderBottom: `1px solid ${theme.palette.divider}` }}
                    >
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PriorityChip priority={item.priority} />
                            <Typography variant="body2" fontWeight={600}>{item.leadName}</Typography>
                          </Box>
                        }
                        secondary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25 }}>
                            <Typography variant="caption" color="text.secondary">{item.vehicleInterest}</Typography>
                            {item.overdue && (
                              <Chip label="OVERDUE" size="small" sx={{ height: 16, fontSize: '0.6rem', fontWeight: 700, bgcolor: alpha('#DC2626', 0.08), color: '#DC2626' }} />
                            )}
                          </Box>
                        }
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', ml: 1 }}>
                        {new Date(item.nextFollowUp).toLocaleDateString()}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent activity timeline */}
        <Grid item xs={12} md={6} lg={4}>
          <ActivityTimeline activities={recentActivity} loading={isLoading} />
        </Grid>

        {/* Salesperson performance */}
        <Grid item xs={12} md={6} lg={4}>
          <Card sx={{ height: '100%' }}>
            <CardHeader title="Salesperson Performance" titleTypographyProps={{ variant: 'h6' }} />
            <CardContent sx={{ pt: 0 }}>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={40} sx={{ mb: 0.5 }} />)
              ) : salespersonPerformance.length === 0 ? (
                <EmptyState text="No salesperson data yet" />
              ) : (
                <List dense disablePadding>
                  {salespersonPerformance.map((sp: SalespersonPerformance, idx: number) => (
                    <ListItem key={sp.salesperson} disableGutters sx={{ py: 0.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                        <Box
                          sx={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: theme.palette.primary.main, fontWeight: 700, fontSize: '0.72rem',
                          }}
                        >
                          {idx + 1}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} noWrap>{sp.salesperson}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {sp.totalLeads} leads · {sp.contacted} contacted · {sp.won} won · {sp.conversionRate}% conv.
                          </Typography>
                        </Box>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ── Activity Timeline component ──────────────────────────────────────────────
const ActivityIconMap: Record<string, React.ReactNode> = {};
import { MessageSquare, Mail, FileText, ArrowLeftRight, Sparkles } from 'lucide-react';
ActivityIconMap.SMS = <MessageSquare size={14} />;
ActivityIconMap.EMAIL = <Mail size={14} />;
ActivityIconMap.NOTE = <FileText size={14} />;
ActivityIconMap.STATUS_CHANGE = <ArrowLeftRight size={14} />;
ActivityIconMap.SCORE = <Sparkles size={14} />;

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const ActivityTimeline: React.FC<{ activities: ActivityItem[]; loading?: boolean }> = ({ activities, loading }) => {
  const theme = useTheme();
  const typeColors: Record<string, string> = {
    SMS: '#2563EB', EMAIL: '#7C3AED', NOTE: '#64748B', STATUS_CHANGE: '#B45309', SCORE: '#15803D',
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader title="Activity Timeline" titleTypographyProps={{ variant: 'h6' }} />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />)
        ) : activities.length === 0 ? (
          <EmptyState text="No recent activity" />
        ) : (
          <List dense disablePadding>
            {activities.slice(0, 8).map((a) => (
              <ListItem key={a.activityId} disableGutters sx={{ py: 0.75, borderBottom: `1px solid ${theme.palette.divider}` }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ p: 0.5, borderRadius: 1, bgcolor: alpha(typeColors[a.type] ?? '#64748B', 0.08), color: typeColors[a.type] ?? '#64748B' }}>
                    {ActivityIconMap[a.type] ?? <FileText size={14} />}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={<Typography variant="body2">{a.description}</Typography>}
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {a.leadName} · {formatRelative(a.createdAt)}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

// ── Empty state helper ───────────────────────────────────────────────────────
const EmptyState: React.FC<{ text: string }> = ({ text }) => (
  <Box sx={{ py: 3, textAlign: 'center' }}>
    <Typography variant="body2" color="text.secondary">{text}</Typography>
  </Box>
);
