import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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




// These checks protect the controlled callbacks used by the root page and persistence.
describe('FiltersPanel workbench controls', () => {
  const renderPanel = (overrides = {}) => {
    const callbacks = { onReset: vi.fn(), onQueryChange: vi.fn(), onPriceChange: vi.fn(), onToggle: vi.fn() };
    render(<FiltersPanel filters={baseFilters} options={options} {...callbacks} {...overrides} />);
    return callbacks;
  };

  it.each([
    ['Snapdragon', 'cpu', 'Snapdragon'],
    ['4500 mAh', 'batteryMah', 4500],
    ['AMOLED', 'screenTech', 'AMOLED'],
    ['120 Hz', 'refreshHz', 120],
    ['65 W', 'chargingW', 65],
    ['Yes', 'wireless', 'Yes'],
    ['No', 'wireless', 'No'],
  ])('keeps the typed callback for %s', async (label, key, value) => {
    const { onToggle } = renderPanel();
    await userEvent.click(screen.getByRole('checkbox', { name: String(label) }));
    expect(onToggle).toHaveBeenCalledWith(key, value);
  });

  it('searches within a group without changing the full specification query or selected values', async () => {
    const { onQueryChange, onToggle } = renderPanel({ filters: { ...baseFilters, cpu: new Set(['Snapdragon']) } });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search CPU options' }), 'DIM');
    expect(screen.getByRole('checkbox', { name: 'Dimensity' })).toBeInTheDocument();
    expect(screen.queryByRole('checkbox', { name: 'Snapdragon' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('1 of 2 options selected')).toBeInTheDocument();
    expect(onQueryChange).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search CPU options' }));
    expect(screen.getByRole('checkbox', { name: 'Snapdragon' })).toBeChecked();
  });

  it('offers recovery for an option search with no matches and clears it on reset', async () => {
    const { onReset } = renderPanel();
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search CPU options' }), 'missing');
    expect(screen.getByRole('status')).toHaveTextContent('No options match');
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('searchbox', { name: 'Search CPU options' })).toHaveValue('');
    expect(screen.getByRole('checkbox', { name: 'Snapdragon' })).toBeInTheDocument();
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('supports keyboard checkbox selection and actually hides collapsed options', async () => {
    const { onToggle } = renderPanel();
    screen.getByRole('checkbox', { name: 'Snapdragon' }).focus();
    await userEvent.keyboard('[Space]');
    expect(onToggle).toHaveBeenCalledWith('cpu', 'Snapdragon');
    screen.getByRole('button', { name: /^CPU/ }).focus();
    await userEvent.keyboard('[Enter]');
    expect(screen.queryByRole('checkbox', { name: 'Snapdragon' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^CPU/ })).toHaveAttribute('aria-expanded', 'false');
  });

  it('labels both price handles and supports keyboard range adjustment', async () => {
    const { onPriceChange } = renderPanel();
    screen.getByRole('slider', { name: 'Minimum price slider' }).focus();
    await userEvent.keyboard('[ArrowRight]');
    expect(onPriceChange).toHaveBeenCalledWith([101000, 200000]);
    expect(screen.getByRole('slider', { name: 'Maximum price slider' })).toHaveAttribute('aria-valuenow', '200000');
  });
});



it.each(['USD', 'EUR'])('adjusts ordinary %s budgets without jumping to an endpoint', async currency => {
  const onPriceChange = vi.fn();
  render(<FiltersPanel currency={currency} filters={{...baseFilters,priceRange:[200,1200]}} options={{...options,priceRange:[200,1200]}} onReset={vi.fn()} onQueryChange={vi.fn()} onPriceChange={onPriceChange} onToggle={vi.fn()} />);
  screen.getByRole('slider', {name:'Minimum price slider'}).focus();
  await userEvent.keyboard('[ArrowRight]');
  expect(onPriceChange).toHaveBeenLastCalledWith([210,1200]);
  screen.getByRole('slider', {name:'Maximum price slider'}).focus();
  await userEvent.keyboard('[ArrowLeft]');
  expect(onPriceChange).toHaveBeenLastCalledWith([200,1190]);
});

it.each([
  ['Minimum price', '250000', [250000, 250000]],
  ['Minimum price', '-1', [-1, 200000]],
  ['Maximum price', '50000', [50000, 50000]],
  ['Maximum price', '250000', [100000, 250000]],
])('preserves ordered price ranges outside catalog bounds for %s set to %s', (label, value, expected) => {
  const onPriceChange = vi.fn();
  render(<FiltersPanel filters={baseFilters} options={options} onReset={vi.fn()} onQueryChange={vi.fn()} onPriceChange={onPriceChange} onToggle={vi.fn()} />);
  const input = screen.getByRole('spinbutton', { name: label });
  fireEvent.change(input, { target: { value } });
  fireEvent.blur(input);
  expect(onPriceChange).toHaveBeenCalledWith(expected);
});


it('allows complete replacement typing with controlled parent updates', async () => {
  function ControlledPanel() {
    const [filters, setFilters] = useState(baseFilters);
    return <FiltersPanel filters={filters} options={options} onReset={vi.fn()} onQueryChange={vi.fn()} onToggle={vi.fn()}
      onPriceChange={(priceRange) => setFilters((previous) => ({ ...previous, priceRange }))} />;
  }
  render(<ControlledPanel />);
  const minimum = screen.getByRole('spinbutton', { name: 'Minimum price' });
  const maximum = screen.getByRole('spinbutton', { name: 'Maximum price' });
  await userEvent.clear(minimum);
  await userEvent.type(minimum, '180000');
  expect(minimum).toHaveValue(180000);
  await userEvent.tab();
  expect(screen.getByRole('slider', { name: 'Minimum price slider' })).toHaveAttribute('aria-valuenow', '180000');
  await userEvent.clear(maximum);
  await userEvent.type(maximum, '150000');
  await userEvent.keyboard('[Enter]');
  expect(minimum).toHaveValue(150000);
  expect(maximum).toHaveValue(150000);
});
