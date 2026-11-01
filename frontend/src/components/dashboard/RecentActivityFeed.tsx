import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  Skeleton,
  Chip,
  Box,
} from '@mui/material';
import {
  MessageSquare as SmsIcon,
  Mail as EmailIcon,
  FileText as NoteIcon,
  ArrowLeftRight as SwapHorizIcon,
  Sparkles as AutoAwesomeIcon,
  UserPlus as UserPlusIcon,
  Calendar as CalendarIcon,
} from 'lucide-react';
import type { ActivityItem } from '@/services/types';

const ICON_MAP: Record<string, React.ReactElement> = {
  SMS: <SmsIcon size={14} />,
  EMAIL: <EmailIcon size={14} />,
  NOTE: <NoteIcon size={14} />,
  STATUS_CHANGE: <SwapHorizIcon size={14} />,
  SCORE: <AutoAwesomeIcon size={14} />,
  ASSIGNMENT: <UserPlusIcon size={14} />,
  APPOINTMENT: <CalendarIcon size={14} />,
};

const COLOR_MAP: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning'> = {
  SMS: 'primary',
  EMAIL: 'secondary',
  NOTE: 'default',
  STATUS_CHANGE: 'warning',
  SCORE: 'success',
};

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  activities: ActivityItem[];
  loading?: boolean;
}

export const RecentActivityFeed: React.FC<Props> = ({ activities, loading }) => (
  <Card>
    <CardHeader title="Recent Activity" titleTypographyProps={{ variant: 'h6' }} />
    <CardContent sx={{ pt: 0 }}>
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={52} sx={{ mb: 0.5 }} />
        ))
      ) : activities.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No recent activity
        </Typography>
      ) : (
        <List dense disablePadding>
          {activities.map((a) => (
            <ListItem key={a.activityId} disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                <Chip
                  icon={ICON_MAP[a.type]}
                  label={a.type.replace('_', ' ')}
                  size="small"
                  color={COLOR_MAP[a.type] ?? 'default'}
                  sx={{ fontSize: 10 }}
                />
              </ListItemIcon>
              <ListItemText
                primary={a.description}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {a.leadName}
                    </Typography>
                    <Typography variant="caption" color="text.disabled">
                      · {formatRelative(a.createdAt)}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </CardContent>
  </Card>
);
