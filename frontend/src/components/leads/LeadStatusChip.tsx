import React from 'react';
import { Chip } from '@mui/material';
import type { LeadStatus } from '@/services/types';

const CONFIG: Record<LeadStatus, { label: string; dot: string; bg: string; text: string }> = {
  NEW:                     { label: 'New',                dot: '#2563EB', bg: 'rgba(37, 99, 235, 0.08)',   text: '#2563EB' },
  CONTACTED:               { label: 'Contacted',           dot: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.08)',  text: '#0EA5E9' },
  QUALIFIED:               { label: 'Qualified',           dot: '#7C3AED', bg: 'rgba(124, 58, 237, 0.08)',  text: '#7C3AED' },
  APPOINTMENT_REQUESTED:   { label: 'Appt Requested',      dot: '#0891B2', bg: 'rgba(8, 145, 178, 0.08)',   text: '#0891B2' },
  APPOINTMENT_CONFIRMED:   { label: 'Appt Confirmed',      dot: '#0E7490', bg: 'rgba(14, 116, 144, 0.08)',  text: '#0E7490' },
  TEST_DRIVE_COMPLETED:    { label: 'Test Drive Done',    dot: '#0369A1', bg: 'rgba(3, 105, 161, 0.08)',   text: '#0369A1' },
  PROPOSAL:                { label: 'Proposal',             dot: '#B45309', bg: 'rgba(180, 83, 9, 0.08)',    text: '#B45309' },
  WON:                     { label: 'Won',                 dot: '#15803D', bg: 'rgba(21, 128, 61, 0.08)',   text: '#15803D' },
  LOST:                     { label: 'Lost',                dot: '#DC2626', bg: 'rgba(220, 38, 38, 0.08)',   text: '#DC2626' },
  NURTURE:                  { label: 'Nurture',              dot: '#64748B', bg: 'rgba(100, 116, 139, 0.08)', text: '#64748B' },
};

interface Props {
  status: LeadStatus;
  size?: 'small' | 'medium';
}

/**
 * Restrained semantic status indicator — a subtle dot + label, not a solid color block.
 */
export const LeadStatusChip: React.FC<Props> = ({ status, size = 'small' }) => {
  const { label, dot, bg, text } = CONFIG[status] ?? CONFIG.NEW;

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: bg,
        color: text,
        fontWeight: 600,
        fontSize: size === 'small' ? '0.72rem' : '0.8rem',
        height: size === 'small' ? 22 : 28,
        '& .MuiChip-label': { px: 1 },
        '&::before': {
          content: '""',
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: dot,
          mr: 0.75,
          flexShrink: 0,
        },
      }}
    />
  );
};

export { CONFIG as STATUS_CONFIG };
