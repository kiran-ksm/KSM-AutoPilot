import React from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Box,
  Chip,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import { MapPin, Gauge, BadgeCheck, Clock } from 'lucide-react';
import type { InventoryVehicle } from '@/services/types';

const CONDITION_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:      { bg: 'rgba(37, 99, 235, 0.08)',  text: '#2563EB' },
  CERTIFIED:{ bg: 'rgba(21, 128, 61, 0.08)',  text: '#15803D' },
  USED:     { bg: 'rgba(180, 83, 9, 0.08)',   text: '#B45309' },
};

const AVAILABILITY_COLORS: Record<string, { bg: string; text: string }> = {
  AVAILABLE: { bg: 'rgba(21, 128, 61, 0.08)',  text: '#15803D' },
  RESERVED:  { bg: 'rgba(180, 83, 9, 0.08)',   text: '#B45309' },
  SOLD:      { bg: 'rgba(220, 38, 38, 0.08)',  text: '#DC2626' },
  IN_TRANSIT:{ bg: 'rgba(14, 165, 233, 0.08)', text: '#0EA5E9' },
};

interface Props {
  vehicle: InventoryVehicle;
  onClick?: (vehicle: InventoryVehicle) => void;
}

export const VehicleCard: React.FC<Props> = ({ vehicle, onClick }) => {
  const theme = useTheme();
  const condColor = CONDITION_COLORS[vehicle.condition] ?? CONDITION_COLORS.USED;
  const availColor = AVAILABILITY_COLORS[vehicle.availabilityStatus] ?? AVAILABILITY_COLORS.AVAILABLE;

  const syncHoursAgo = Math.round((Date.now() - new Date(vehicle.lastSyncedAt).getTime()) / 3600000);
  const isFresh = syncHoursAgo < 2;

  return (
    <Card
      onClick={() => onClick?.(vehicle)}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: theme.palette.primary.main },
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Demo label */}
      <Box
        sx={{
          position: 'absolute',
          m: 1,
          zIndex: 1,
        }}
      >
        <Chip
          label="DEMO DATA"
          size="small"
          sx={{
            fontSize: '0.6rem',
            fontWeight: 700,
            bgcolor: alpha('#B45309', 0.08),
            color: '#B45309',
          }}
        />
      </Box>

      {/* Vehicle image */}
      <CardMedia
        component="img"
        height="160"
        image={vehicle.imageUrl}
        alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
        sx={{ objectFit: 'cover', bgcolor: alpha(theme.palette.primary.main, 0.04) }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />

      <CardContent sx={{ flex: 1, p: 2 }}>
        {/* Title */}
        <Typography variant="body1" fontWeight={700} noWrap>
          {vehicle.year} {vehicle.make} {vehicle.model}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {vehicle.trim}
        </Typography>

        {/* Price */}
        <Typography variant="h6" fontWeight={700} color="primary.main" sx={{ mb: 1 }}>
          {vehicle.price > 0 ? `$${vehicle.price.toLocaleString()}` : 'Price on Request'}
        </Typography>

        {/* Key specs */}
        <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Gauge size={14} style={{ color: theme.palette.text.secondary }} />
            <Typography variant="caption" color="text.secondary">
              {vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : 'New'}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <MapPin size={14} style={{ color: theme.palette.text.secondary }} />
            <Typography variant="caption" color="text.secondary" noWrap>
              {vehicle.dealershipName.replace(/.*?(\w+ of \w+).*/, '$1') || vehicle.dealershipName}
            </Typography>
          </Stack>
        </Stack>

        {/* Chips: condition + availability */}
        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
          <Chip
            label={vehicle.condition}
            size="small"
            sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: condColor.bg, color: condColor.text }}
          />
          <Chip
            label={vehicle.availabilityStatus.replace('_', ' ')}
            size="small"
            sx={{ fontSize: '0.65rem', fontWeight: 600, bgcolor: availColor.bg, color: availColor.text }}
          />
        </Stack>

        {/* VIN / Stock */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
          VIN: {vehicle.vin.slice(0, 8)}... · Stock: {vehicle.stockNumber}
        </Typography>

        {/* Freshness indicator */}
        <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
          {isFresh ? (
            <BadgeCheck size={12} style={{ color: '#15803D' }} />
          ) : (
            <Clock size={12} style={{ color: '#B45309' }} />
          )}
          <Typography
            variant="caption"
            sx={{ color: isFresh ? '#15803D' : '#B45309' }}
          >
            {isFresh ? 'Verified recently' : `Synced ${syncHoursAgo}h ago`} · Source: {vehicle.sourceSystem}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
};
