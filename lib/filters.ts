import type { Phone } from './schema';

export type WirelessOption = 'Yes' | 'No';

export type FilterState = {
  query: string;
  priceRange: [number, number];
  cpu: Set<string>;
  batteryMah: Set<number>;
  screenTech: Set<string>;
  refreshHz: Set<number>;
  chargingW: Set<number>;
  wireless: Set<WirelessOption>;
};

export type SerializedFilterState = {
  query: string;
  priceRange: [number, number];
  cpu: string[];
  batteryMah: number[];
  screenTech: string[];
  refreshHz: number[];
  chargingW: number[];
  wireless: WirelessOption[];
};

export const WIRELESS_OPTIONS: WirelessOption[] = ['Yes', 'No'];

export type FilterOptions = {
  cpu: string[];
  batteryMah: number[];
  screenTech: string[];
  refreshHz: number[];
  chargingW: number[];
  wireless: WirelessOption[];
  priceRange: [number, number];
};

export function createInitialFilters(phones: Phone[]): FilterState {
  const prices = phones.map(p => p.price).sort((a, b) => a - b);
  const minPrice = prices[0] ?? 0;
  const maxPrice = prices[prices.length - 1] ?? minPrice;
  return {
    query: '',
    priceRange: [minPrice, maxPrice],
    cpu: new Set(),
    batteryMah: new Set(),
    screenTech: new Set(),
    refreshHz: new Set(),
    chargingW: new Set(),
    wireless: new Set(),
  };
}

export function applyFilters(phones: Phone[], filters: FilterState): Phone[] {
  const term = filters.query.trim().toLowerCase();
  const [minPrice, maxPrice] = filters.priceRange;

  return phones.filter(phone => {
    if (phone.price < minPrice || phone.price > maxPrice) return false;
    if (filters.cpu.size && !filters.cpu.has(phone.cpu)) return false;
    if (filters.screenTech.size && !filters.screenTech.has(phone.screen.tech)) return false;
    if (filters.batteryMah.size && !filters.batteryMah.has(phone.batteryMah)) return false;
    if (filters.refreshHz.size && !filters.refreshHz.has(phone.refreshHz)) return false;
    if (filters.chargingW.size && !filters.chargingW.has(phone.chargingW)) return false;
    if (filters.wireless.size) {
      const hasWireless: WirelessOption = phone.wirelessW > 0 ? 'Yes' : 'No';
      if (!filters.wireless.has(hasWireless)) return false;
    }
    if (term) {
      const blob = JSON.stringify(phone).toLowerCase();
      if (!blob.includes(term)) return false;
    }
    return true;
  });
}

export function toggleSet<T>(current: Set<T>, value: T): Set<T> {
  const next = new Set(current);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function serializeFilters(filters: FilterState): SerializedFilterState {
  return {
    query: filters.query,
    priceRange: filters.priceRange,
    cpu: Array.from(filters.cpu),
    batteryMah: Array.from(filters.batteryMah),
    screenTech: Array.from(filters.screenTech),
    refreshHz: Array.from(filters.refreshHz),
    chargingW: Array.from(filters.chargingW),
    wireless: Array.from(filters.wireless),
  };
}

export function deserializeFilters(
  serialized: Partial<SerializedFilterState> | null,
  fallback: FilterState
): FilterState {
  if (!serialized) return fallback;

  const priceRange = Array.isArray(serialized.priceRange) && serialized.priceRange.length === 2
    ? serialized.priceRange as [number, number]
    : fallback.priceRange;

  try {
    return {
      query: typeof serialized.query === 'string' ? serialized.query : fallback.query,
      priceRange,
      cpu: new Set(serialized.cpu ?? Array.from(fallback.cpu)),
      batteryMah: new Set(serialized.batteryMah ?? Array.from(fallback.batteryMah)),
      screenTech: new Set(serialized.screenTech ?? Array.from(fallback.screenTech)),
      refreshHz: new Set(serialized.refreshHz ?? Array.from(fallback.refreshHz)),
      chargingW: new Set(serialized.chargingW ?? Array.from(fallback.chargingW)),
      wireless: new Set(serialized.wireless ?? Array.from(fallback.wireless)),
    };
  } catch {
    return fallback;
  }
}

export function buildFilterOptions(phones: Phone[]): FilterOptions {
  const unique = <T>(iterable: T[]) => Array.from(new Set(iterable));
  const prices = phones.map((p) => p.price).sort((a, b) => a - b);
  return {
    cpu: unique(phones.map((p) => p.cpu)).sort(),
    batteryMah: unique(phones.map((p) => p.batteryMah)).sort((a, b) => a - b),
    screenTech: unique(phones.map((p) => p.screen.tech)).sort(),
    refreshHz: unique(phones.map((p) => p.refreshHz)).sort((a, b) => a - b),
    chargingW: unique(phones.map((p) => p.chargingW)).sort((a, b) => a - b),
    wireless: WIRELESS_OPTIONS,
    priceRange: [prices[0] ?? 0, prices[prices.length - 1] ?? 0],
  };
}
