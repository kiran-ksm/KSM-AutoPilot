import React from 'react';
import { Box, Tooltip } from '@mui/material';
import { Sparkles } from 'lucide-react';

interface Props {
  score?: number;
  loading?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 80) return '#15803D';
  if (score >= 60) return '#2563EB';
  return '#DC2626';
}

export const LeadScoreBadge: React.FC<Props> = ({ score }) => {
  if (score === undefined || score === null) return null;

  const color = scoreColor(score);

  return (
    <Tooltip title="AI Lead Score (0–100)">
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          fontSize: '0.72rem',
          fontWeight: 700,
          color,
          bgcolor: `${color}0D`,
        }}
      >
        <Sparkles size={12} style={{ color }} />
        {score}
      </Box>
    </Tooltip>
  );
};
