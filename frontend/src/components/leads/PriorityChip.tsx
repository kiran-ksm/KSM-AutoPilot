import React from 'react';
import { Chip } from '@mui/material';
import { Flame, Thermometer, Snowflake, HelpCircle } from 'lucide-react';
import type { LeadPriority } from '@/services/types';

const CONFIG: Record<LeadPriority, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  HOT:           { label: 'Hot',           color: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)',   icon: <Flame size={12} /> },
  WARM:          { label: 'Warm',          color: '#B45309', bg: 'rgba(180, 83, 9, 0.08)',    icon: <Thermometer size={12} /> },
  COLD:          { label: 'Cold',          color: '#64748B', bg: 'rgba(100, 116, 139, 0.08)', icon: <Snowflake size={12} /> },
  UNCLASSIFIED:  { label: 'Unclassified',  color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.08)', icon: <HelpCircle size={12} /> },
};

interface Props {
  priority: LeadPriority;
  size?: 'small' | 'medium';
}

export const PriorityChip: React.FC<Props> = ({ priority, size = 'small' }) => {
  const config = CONFIG[priority] ?? CONFIG.COLD;
  return (
    <Chip
      label={config.label}
      size={size}
      icon={config.icon as React.ReactElement}
      sx={{
        bgcolor: config.bg,
        color: config.color,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-icon': { color: config.color, ml: 0.5, fontSize: 12 },
      }}
    />
  );
};
