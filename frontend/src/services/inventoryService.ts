import type { InventoryVehicle } from './types';

/**
 * Inventory service — mock implementation.
 *
 * Per spec Section 10: mock inventory must be visibly labeled demo data,
 * include source and freshness metadata, and not claim real-time availability
 * unless the source supports it. Build a replaceable adapter for a future API.
 *
 * When a real inventory provider is connected, replace this file's implementation
 * with API Gateway calls. The service interface stays the same.
 */

const DEMO_DEALERSHIPS = [
  { id: 'dealership-mercedes', name: 'Ray Catena Mercedes-Benz of Edison', brand: 'Mercedes-Benz', location: 'Edison, NJ' },
  { id: 'dealership-toyota',   name: 'Tri-State Toyota',                   brand: 'Toyota',       location: 'Woodbridge, NJ' },
  { id: 'dealership-lexus',    name: 'Premier Lexus',                       brand: 'Lexus',         location: 'Bridgewater, NJ' },
];

const MOCK_VEHICLES: InventoryVehicle[] = [
  _v('dealership-mercedes', 'Ray Catena Mercedes-Benz of Edison', 'Mercedes-Benz', 2024, 'Mercedes-Benz', 'C-Class', 'C 300 4MATIC', 'NEW', 0, 47900, 'Polar White', 'Black', 'https://images.unsplash.com/photo-1617531653332-e21c0b8a1b3e?w=600'),
  _v('dealership-mercedes', 'Ray Catena Mercedes-Benz of Edison', 'Mercedes-Benz', 2024, 'Mercedes-Benz', 'GLE 450', 'GLE 450 4MATIC', 'NEW', 0, 72500, 'Selenite Grey', 'Macchiato Beige', 'https://images.unsplash.com/photo-1606664515527-edb25c1fb77f?w=600'),
  _v('dealership-mercedes', 'Ray Catena Mercedes-Benz of Edison', 'Mercedes-Benz', 2023, 'Mercedes-Benz', 'E-Class', 'E 350 Sedan', 'CERTIFIED', 8420, 58900, 'Obsidian Black', 'Bahia Beige', 'https://images.unsplash.com/photo-1618843477313-2c0a0a0a0a0a?w=600'),
  _v('dealership-mercedes', 'Ray Catena Mercedes-Benz of Edison', 'Mercedes-Benz', 2022, 'Mercedes-Benz', 'GLC 300', 'GLC 300 4MATIC', 'USED', 18750, 42900, 'Iridium Silver', 'Black', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600'),
  _v('dealership-mercedes', 'Ray Catena Mercedes-Benz of Edison', 'Mercedes-Benz', 2024, 'Mercedes-Benz', 'S-Class', 'S 500 4MATIC', 'NEW', 0, 114500, 'Diamond White', 'Sienna Brown', 'https://images.unsplash.com/photo-1622248109327-1c0c0c0c0c0c?w=600'),
  _v('dealership-toyota', 'Tri-State Toyota', 'Toyota', 2024, 'Toyota', 'Camry', 'XSE', 'NEW', 0, 32600, 'Midnight Black', 'Cockpit Red', 'https://images.unsplash.com/photo-1621007947382-bb3c3994b3e2?w=600'),
  _v('dealership-toyota', 'Tri-State Toyota', 'Toyota', 2024, 'Toyota', 'RAV4', 'XLE Hybrid', 'NEW', 0, 35500, 'Silver Sky Metallic', 'Black', 'https://images.unsplash.com/photo-1606664515527-edb25c1fb77f?w=600'),
  _v('dealership-toyota', 'Tri-State Toyota', 'Toyota', 2023, 'Toyota', 'Corolla', 'SE', 'USED', 14500, 21800, 'Blueprint', 'Black', 'https://images.unsplash.com/photo-1590362891991-43c0c0c0c0c0?w=600'),
  _v('dealership-toyota', 'Tri-State Toyota', 'Toyota', 2024, 'Toyota', 'Highlander', 'Limited', 'NEW', 0, 47300, 'Wind Chill Pearl', 'Black', 'https://images.unsplash.com/photo-1606664515527-edb25c1fb77f?w=600'),
  _v('dealership-toyota', 'Tri-State Toyota', 'Toyota', 2022, 'Toyota', 'Tacoma', 'TRD Off-Road', 'USED', 23100, 31400, 'Cavalry Blue', 'Black', 'https://images.unsplash.com/photo-1590362891991-43c0c0c0c0c0?w=600'),
  _v('dealership-lexus', 'Premier Lexus', 'Lexus', 2024, 'Lexus', 'RX 350', 'Luxury', 'NEW', 0, 52750, 'Nori Green Pearl', 'Black', 'https://images.unsplash.com/photo-1606664515527-edb25c1fb77f?w=600'),
  _v('dealership-lexus', 'Premier Lexus', 'Lexus', 2024, 'Lexus', 'ES 350', 'Ultra Luxury', 'NEW', 0, 46800, 'Eminent White Pearl', 'Black', 'https://images.unsplash.com/photo-1622248109327-1c0c0a0a0a0a?w=600'),
  _v('dealership-lexus', 'Premier Lexus', 'Lexus', 2023, 'Lexus', 'IS 350', 'F SPORT', 'CERTIFIED', 12100, 45200, 'Nebula Grey Pearl', 'Circuit Red', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=600'),
  _v('dealership-lexus', 'Premier Lexus', 'Lexus', 2022, 'Lexus', 'NX 350', 'F SPORT', 'USED', 19800, 41800, 'Atomic Silver', 'Black', 'https://images.unsplash.com/photo-1606664515527-edb25c1fb77f?w=600'),
  _v('dealership-lexus', 'Premier Lexus', 'Lexus', 2024, 'Lexus', 'LX 600', 'Ultra Luxury', 'NEW', 0, 89500, 'Sonic Quartz', 'Black', 'https://images.unsplash.com/photo-1621007947382-bb3c3994b3e2?w=600'),
];

function _v(
  dealershipId: string,
  dealershipName: string,
  _brand: string,
  year: number,
  make: string,
  model: string,
  trim: string,
  condition: 'NEW' | 'USED' | 'CERTIFIED',
  mileage: number,
  price: number,
  exteriorColor: string,
  interiorColor: string,
  imageUrl: string,
): InventoryVehicle {
  const now = Date.now();
  const vinBase = make.substring(0, 2).toUpperCase() + year.toString().slice(-2);
  const syncOffset = Math.floor(Math.random() * 4) * 3600000; // 0-3 hours ago
  return {
    vehicleId: `${dealershipId}-${year}-${make}-${model}-${trim}`.replace(/\s+/g, '-').toLowerCase(),
    tenantId: 'tenant-dev-001',
    dealershipId,
    dealershipName,
    vin: `${vinBase}${Math.random().toString(36).substring(2, 12).toUpperCase().padEnd(14, '0').slice(0, 14)}`,
    stockNumber: `STK-${Math.floor(Math.random() * 90000 + 10000)}`,
    year,
    make,
    model,
    trim,
    condition,
    mileage,
    price,
    currency: 'USD',
    exteriorColor,
    interiorColor,
    imageUrl,
    availabilityStatus: Math.random() > 0.85 ? 'RESERVED' : 'AVAILABLE',
    sourceSystem: 'demo-inventory-adapter',
    sourceUpdatedAt: new Date(now - syncOffset).toISOString(),
    lastSyncedAt: new Date(now - syncOffset).toISOString(),
  };
}

export const inventoryService = {
  async list(filters?: {
    dealershipId?: string;
    make?: string;
    condition?: string;
    availabilityStatus?: string;
  }): Promise<InventoryVehicle[]> {
    // Simulate API latency
    await new Promise((r) => setTimeout(r, 300));

    let result = MOCK_VEHICLES;
    if (filters?.dealershipId) {
      result = result.filter((v) => v.dealershipId === filters.dealershipId);
    }
    if (filters?.make) {
      result = result.filter((v) => v.make === filters.make);
    }
    if (filters?.condition) {
      result = result.filter((v) => v.condition === filters.condition);
    }
    if (filters?.availabilityStatus) {
      result = result.filter((v) => v.availabilityStatus === filters.availabilityStatus);
    }
    return result;
  },

  async get(vehicleId: string): Promise<InventoryVehicle | null> {
    await new Promise((r) => setTimeout(r, 200));
    return MOCK_VEHICLES.find((v) => v.vehicleId === vehicleId) ?? null;
  },

  async listDealerships(): Promise<typeof DEMO_DEALERSHIPS> {
    await new Promise((r) => setTimeout(r, 150));
    return DEMO_DEALERSHIPS;
  },
};
