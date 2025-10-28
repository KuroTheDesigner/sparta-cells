import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

import { FiltersPanel } from '@/components/specs/FiltersPanel';
import { createInitialFilters, type FilterOptions, type WirelessOption } from '@/lib/filters';
import type { Phone } from '@/lib/schema';

const phones: Phone[] = [
  {
    name: 'Sample',
    price: 120_000,
    cpu: 'Snapdragon',
    batteryMah: 4500,
    screen: { tech: 'AMOLED', sizeIn: 6.5, resolution: '1080x2400' },
    cameras: { rear: [{ mp: 50, type: 'Wide' }], frontMp: 16 },
    refreshHz: 120,
    chargingW: 65,
    wirelessW: 30,
    video: '4K',
    features: { headphone: false, sim: 'Dual SIM' },
  },
];

const filters = createInitialFilters(phones);
const wireless: WirelessOption[] = ['Yes', 'No'];
const options: FilterOptions = {
  cpu: ['Snapdragon'],
  batteryMah: [4500],
  screenTech: ['AMOLED'],
  refreshHz: [120],
  chargingW: [65],
  wireless,
  priceRange: [phones[0].price, phones[0].price],
};

describe('FiltersPanel accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(
      <FiltersPanel
        filters={filters}
        options={options}
        onReset={() => undefined}
        onQueryChange={() => undefined}
        onPriceChange={() => undefined}
        onToggle={() => undefined}
      />
    );
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);
  });
});


