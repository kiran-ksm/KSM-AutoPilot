import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  TextField,
  MenuItem,
  Stack,
  Skeleton,
  Alert,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import { Car, Info } from 'lucide-react';
import { VehicleCard } from '@/components/inventory/VehicleCard';
import { VehicleDetailDrawer } from '@/components/inventory/VehicleDetailDrawer';
import { inventoryService } from '@/services/inventoryService';
import type { InventoryVehicle } from '@/services/types';

export const InventoryPage: React.FC = () => {
  const theme = useTheme();
  const [vehicles, setVehicles] = useState<InventoryVehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dealerships, setDealerships] = useState<{ id: string; name: string }[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<InventoryVehicle | null>(null);

  const [dealershipFilter, setDealershipFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [ds, vs] = await Promise.all([
          inventoryService.listDealerships(),
          inventoryService.list(),
        ]);
        setDealerships(ds.map((d) => ({ id: d.id, name: d.name })));
        setVehicles(vs);
      } catch {
        setError('Failed to load inventory');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filtered = vehicles.filter((v) => {
    if (dealershipFilter && v.dealershipId !== dealershipFilter) return false;
    if (conditionFilter && v.condition !== conditionFilter) return false;
    if (availabilityFilter && v.availabilityStatus !== availabilityFilter) return false;
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Car size={24} style={{ color: theme.palette.primary.main }} />
          <Typography variant="h4" fontWeight={700}>Inventory</Typography>
          {!isLoading && (
            <Typography variant="body2" color="text.secondary">
              {filtered.length} vehicles
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Demo data warning */}
      <Alert severity="info" icon={<Info size={18} />} sx={{ mb: 2 }}>
        <strong>Demo Inventory.</strong> Showing synthetic data from a mock inventory adapter. Availability is simulated and not real-time.
      </Alert>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          select
          label="Dealership"
          size="small"
          value={dealershipFilter}
          onChange={(e) => setDealershipFilter(e.target.value)}
          sx={{ minWidth: 200, flex: 1 }}
        >
          <MenuItem value="">All dealerships</MenuItem>
          {dealerships.map((d) => (
            <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Condition"
          size="small"
          value={conditionFilter}
          onChange={(e) => setConditionFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="NEW">New</MenuItem>
          <MenuItem value="CERTIFIED">Certified</MenuItem>
          <MenuItem value="USED">Used</MenuItem>
        </TextField>
        <TextField
          select
          label="Availability"
          size="small"
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="AVAILABLE">Available</MenuItem>
          <MenuItem value="RESERVED">Reserved</MenuItem>
          <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
        </TextField>
      </Stack>

      {/* Vehicle grid */}
      {isLoading ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid item key={i} xs={12} sm={6} md={4} lg={3}>
              <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Car size={48} style={{ color: theme.palette.text.secondary, marginBottom: 8 }} />
            <Typography color="text.secondary">No vehicles match your filters.</Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((vehicle) => (
            <Grid item key={vehicle.vehicleId} xs={12} sm={6} md={4} lg={3}>
              <VehicleCard vehicle={vehicle} onClick={setSelectedVehicle} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Vehicle detail + enquiry drawer */}
      <VehicleDetailDrawer
        vehicle={selectedVehicle}
        open={Boolean(selectedVehicle)}
        onClose={() => setSelectedVehicle(null)}
      />
    </Box>
  );
};
