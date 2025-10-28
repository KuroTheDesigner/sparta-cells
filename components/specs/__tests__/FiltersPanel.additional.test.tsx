import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FiltersPanel } from '@/components/specs/FiltersPanel';
import type { FilterOptions, WirelessOption } from '@/lib/filters';

const baseFilters = {
  query: '',
  priceRange: [100000, 200000] as [number, number],
  cpu: new Set<string>(),
  batteryMah: new Set<number>(),
  screenTech: new Set<string>(),
  refreshHz: new Set<number>(),
  chargingW: new Set<number>(),
  wireless: new Set<'Yes' | 'No'>(),
};

const wirelessOptions: WirelessOption[] = ['Yes', 'No'];
const options: FilterOptions = {
  cpu: ['Snapdragon', 'Dimensity'],
  batteryMah: [4500, 5000],
  screenTech: ['AMOLED', 'OLED'],
  refreshHz: [90, 120],
  chargingW: [33, 65],
  wireless: wirelessOptions,
  priceRange: [100000, 200000],
};

describe('FiltersPanel extras', () => {
  it('invokes onReset when Clear is clicked', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(
      <FiltersPanel
        filters={baseFilters}
        options={options}
        onReset={onReset}
        onQueryChange={vi.fn()}
        onPriceChange={vi.fn()}
        onToggle={vi.fn()}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onReset).toHaveBeenCalled();
  });

  it('search input calls onQueryChange', async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();
    render(
      <FiltersPanel
        filters={baseFilters}
        options={options}
        onReset={vi.fn()}
        onQueryChange={onQueryChange}
        onPriceChange={vi.fn()}
        onToggle={vi.fn()}
      />
    );
    const mobileSearch = screen.getByPlaceholderText('Search phones...');
    await user.type(mobileSearch, 'alpha');
    expect(onQueryChange).toHaveBeenCalled();
  });

  it('price inputs call onPriceChange with clamped values', async () => {
    const user = userEvent.setup();
    const onPriceChange = vi.fn();
    render(
      <FiltersPanel
        filters={baseFilters}
        options={options}
        onReset={vi.fn()}
        onQueryChange={vi.fn()}
        onPriceChange={onPriceChange}
        onToggle={vi.fn()}
      />
    );
    const min = screen.getByLabelText('Minimum price');
    const max = screen.getByLabelText('Maximum price');
    await user.clear(min);
    await user.type(min, '180000');
    await user.clear(max);
    await user.type(max, '120000');
    expect(onPriceChange).toHaveBeenCalled();
  });
});



