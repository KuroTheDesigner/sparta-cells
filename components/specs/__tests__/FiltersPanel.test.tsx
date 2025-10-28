import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltersPanel } from '@/components/specs/FiltersPanel';
import { createInitialFilters, type FilterOptions, type WirelessOption } from '@/lib/filters';
import type { Phone } from '@/lib/schema';

const phones: Phone[] = [
  {
    name: 'Sample',
    price: 100_000,
    cpu: 'Tensor',
    batteryMah: 4300,
    screen: { tech: 'OLED', sizeIn: 6.1, resolution: '1080x2400' },
    cameras: { rear: [{ mp: 50, type: 'Wide' }], frontMp: 12 },
    refreshHz: 120,
    chargingW: 30,
    wirelessW: 18,
    video: '4K',
    features: { headphone: false, sim: 'Dual SIM' },
  },
];

const filters = createInitialFilters(phones);
const wireless: WirelessOption[] = ['Yes', 'No'];
const options: FilterOptions = {
  cpu: ['Tensor'],
  batteryMah: [4300],
  screenTech: ['OLED'],
  refreshHz: [120],
  chargingW: [30],
  wireless,
  priceRange: [phones[0].price, phones[0].price],
};

describe('FiltersPanel', () => {
  it('renders options and fires toggle callbacks', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <FiltersPanel
        filters={filters}
        options={options}
        onReset={vi.fn()}
        onQueryChange={vi.fn()}
        onPriceChange={vi.fn()}
        onToggle={onToggle}
      />
    );

    const checkbox = screen.getByLabelText('Tensor');
    await user.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith('cpu', 'Tensor');
  });
});
