import { describe, expect, it } from 'vitest';
import { applyFilters, createInitialFilters, toggleSet, serializeFilters, deserializeFilters, buildFilterOptions } from '@/lib/filters';
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

describe('filters', () => {
  it('applies selected facets', () => {
    const filters = createInitialFilters(phones);
    filters.cpu = toggleSet(filters.cpu, 'Snapdragon');
    const results = applyFilters(phones, filters);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Alpha');
  });

  it('serializes and deserializes state', () => {
    const initial = createInitialFilters(phones);
    const mutated = {
      ...initial,
      query: 'alpha',
      priceRange: [190_000, 210_000] as [number, number],
      cpu: toggleSet(initial.cpu, 'Snapdragon'),
    };
    const serialized = serializeFilters(mutated);
    const restored = deserializeFilters(serialized, initial);
    expect(restored.query).toBe('alpha');
    expect(restored.priceRange).toEqual([190_000, 210_000]);
    expect(restored.cpu.has('Snapdragon')).toBe(true);
  });

  it('builds filter options from dataset', () => {
    const options = buildFilterOptions(phones);
    expect(options.cpu).toEqual(['Dimensity', 'Snapdragon']);
    expect(options.batteryMah).toEqual([4500, 5000]);
    expect(options.priceRange[0]).toBe(150_000);
    expect(options.priceRange[1]).toBe(200_000);
  });
});
