import { describe, it, expect } from 'vitest';
import { applyFilters, buildFilterOptions, createInitialFilters, toggleSet, type FilterState } from '@/lib/filters';
import type { Phone } from '@/lib/schema';

const phones: Phone[] = [
  {
    name: 'Alpha',
    price: 200_000,
    cpu: 'Snapdragon',
    batteryMah: 4500,
    screen: { tech: 'AMOLED', sizeIn: 6.5, resolution: '1080x2400' },
    cameras: { rear: [{ mp: 50, type: 'Wide' }], frontMp: 32 },
    refreshHz: 120,
    chargingW: 65,
    wirelessW: 30,
    video: '4K',
    features: { headphone: false, sim: 'Dual SIM' },
  },
  {
    name: 'Bravo',
    price: 150_000,
    cpu: 'Dimensity',
    batteryMah: 5000,
    screen: { tech: 'OLED', sizeIn: 6.7, resolution: '1440x3200' },
    cameras: { rear: [{ mp: 64, type: 'Wide' }], frontMp: 20 },
    refreshHz: 90,
    chargingW: 33,
    wirelessW: 0,
    video: '4K',
    features: { headphone: true, sim: 'Dual SIM' },
  },
];

describe('filters (enhanced)', () => {
  it('query matching is case-insensitive and trims whitespace', () => {
    const filters = createInitialFilters(phones);
    filters.query = '  ALphA  ';
    const results = applyFilters(phones, filters);
    expect(results.map(p => p.name)).toEqual(['Alpha']);
  });

  it('buildFilterOptions sorts and deduplicates; price bounds are min/max', () => {
    const options = buildFilterOptions(phones);
    expect(options.cpu).toEqual(['Dimensity', 'Snapdragon']);
    expect(options.priceRange[0]).toBe(150_000);
    expect(options.priceRange[1]).toBe(200_000);
  });

  it('wireless filter: 0W counts as "No"', () => {
    const filters: FilterState = {
      ...createInitialFilters(phones),
      wireless: toggleSet(new Set<'Yes' | 'No'>(), 'No'),
    } as FilterState;
    const results = applyFilters(phones, filters);
    expect(results.map(p => p.name)).toEqual(['Bravo']);
  });
});



