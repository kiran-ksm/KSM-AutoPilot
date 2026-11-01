import React from 'react';
import { Card, CardContent, CardHeader, Box, Skeleton } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LeadsByStatusItem } from '@/services/types';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#2563EB',
  CONTACTED: '#0EA5E9',
  QUALIFIED: '#7C3AED',
  PROPOSAL: '#B45309',
  WON: '#15803D',
  LOST: '#DC2626',
  NURTURE: '#64748B',
};

interface Props {
  data: LeadsByStatusItem[];
  loading?: boolean;
}

export const LeadsByStatusChart: React.FC<Props> = ({ data, loading }) => (
  <Card>
    <CardHeader title="Leads by Status" titleTypographyProps={{ variant: 'h6' }} />
    <CardContent>
      {loading ? (
        <Skeleton variant="rectangular" height={220} />
      ) : (
        <Box sx={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <XAxis
                dataKey="status"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ')
                }
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                formatter={(value: number) => [value, 'Leads']}
                labelFormatter={(label: string) =>
                  label.charAt(0) + label.slice(1).toLowerCase()
                }
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.status}
                    fill={STATUS_COLORS[entry.status] ?? '#1A3C6E'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>
      )}
    </CardContent>
  </Card>
);
