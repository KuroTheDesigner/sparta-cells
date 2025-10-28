"use client";

import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/cn';
import {
  type FilterState,
  type FilterOptions,
  type WirelessOption,
} from '@/lib/filters';
import { formatCurrency } from '@/lib/format';

type ToggleableKeys = 'cpu' | 'batteryMah' | 'screenTech' | 'refreshHz' | 'chargingW' | 'wireless';

type FiltersPanelProps = {
  filters: FilterState;
  options: FilterOptions;
  onReset: () => void;
  onQueryChange: (value: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onToggle: (key: ToggleableKeys, value: string | number | WirelessOption) => void;
};

export function FiltersPanel({
  filters,
  options,
  onReset,
  onQueryChange,
  onPriceChange,
  onToggle,
}: FiltersPanelProps) {
  const [minPrice, maxPrice] = filters.priceRange;

  const priceMarks = useMemo(() => [options.priceRange[0], options.priceRange[1]], [options.priceRange]);

  return (
    <div className="relative flex flex-col gap-6" data-testid="filters-panel">
      <header className="filters-header">
        <div>
          <p className="filters-title">Filters</p>
          <p className="text-xs text-fg-muted">Dial in the specs that matter most to you.</p>
        </div>
        <button
          onClick={onReset}
          className="rounded-full bg-[hsl(var(--accent))] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[hsl(var(--accent-fg))] shadow-[0_14px_24px_-18px_rgba(79,70,229,0.6)] transition-opacity hover:opacity-90"
        >
          Clear
        </button>
      </header>

      <div className="sm:hidden">
        <Label htmlFor="mobile-search" className="mb-2 block text-xs uppercase tracking-[0.2em] text-fg-muted">Search</Label>
        <input
          id="mobile-search"
          className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-sm shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/50"
          placeholder="Search phones..."
          value={filters.query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>

      <section className="filters-section space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs uppercase tracking-[0.2em] text-fg-muted">Price range</Label>
          <span className="text-[11px] font-medium text-fg-muted/80">₦</span>
        </div>
        <Slider
          min={options.priceRange[0]}
          max={options.priceRange[1]}
          value={[minPrice, maxPrice]}
          step={5000}
          onValueChange={(value) => {
            const [min, max] = value as [number, number];
            onPriceChange([min, max]);
          }}
        />
        <div className="flex justify-between text-xs text-fg-muted">
          <span>{formatCurrency(priceMarks[0])}</span>
          <span>{formatCurrency(priceMarks[1])}</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <input
            type="number"
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-sm shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/50"
            value={minPrice}
            min={options.priceRange[0]}
            max={maxPrice}
            onChange={(event) => {
              const value = Number(event.target.value) || options.priceRange[0];
              onPriceChange([value, Math.max(value, filters.priceRange[1])]);
            }}
            aria-label="Minimum price"
          />
          <span className="text-xs uppercase tracking-[0.2em] text-fg-muted">to</span>
          <input
            type="number"
            className="w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-sm shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/50"
            value={maxPrice}
            min={minPrice}
            max={options.priceRange[1]}
            onChange={(event) => {
              const value = Number(event.target.value) || options.priceRange[1];
              onPriceChange([Math.min(filters.priceRange[0], value), value]);
            }}
            aria-label="Maximum price"
          />
        </div>
      </section>

      <FilterSection
        title="CPU"
        options={options.cpu}
        selected={filters.cpu}
        onToggle={(value) => onToggle('cpu', value)}
      />

      <FilterSection
        title="Screen Technology"
        options={options.screenTech}
        selected={filters.screenTech}
        onToggle={(value) => onToggle('screenTech', value)}
      />

      <FilterSection
        title="Battery (mAh)"
        options={options.batteryMah}
        selected={filters.batteryMah}
        onToggle={(value) => onToggle('batteryMah', value)}
        renderLabel={(value) => `${value} mAh`}
      />

      <FilterSection
        title="Refresh Rate (Hz)"
        options={options.refreshHz}
        selected={filters.refreshHz}
        onToggle={(value) => onToggle('refreshHz', value)}
        renderLabel={(value) => `${value} Hz`}
      />

      <FilterSection
        title="Charging Speed (W)"
        options={options.chargingW}
        selected={filters.chargingW}
        onToggle={(value) => onToggle('chargingW', value)}
        renderLabel={(value) => `${value} W`}
      />

      <FilterSection
        title="Wireless Charging"
        options={options.wireless}
        selected={filters.wireless}
        onToggle={(value) => onToggle('wireless', value)}
      />
      <div className="md:hidden sticky bottom-0 -mx-4 flex items-center justify-between gap-3 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--bg))/0.94] px-4 py-3 text-xs text-fg-muted backdrop-blur">
        <button
          onClick={onReset}
          className="rounded-full bg-[hsl(var(--accent))] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-[hsl(var(--accent-fg))] shadow-[0_12px_22px_-18px_rgba(79,70,229,0.55)] hover:opacity-90"
        >
          Clear filters
        </button>
        <span className="text-[11px]">Tap outside or use Close to exit</span>
      </div>
    </div>
  );
}

type FilterSectionProps<T extends string | number> = {
  title: string;
  options: T[];
  selected: Set<T>;
  onToggle: (value: T) => void;
  renderLabel?: (value: T) => string;
};

function FilterSection<T extends string | number>({ title, options, selected, onToggle, renderLabel }: FilterSectionProps<T>) {
  if (!options.length) return null;

  return (
    <Collapsible defaultOpen>
      <div className="filters-section space-y-4">
        <CollapsibleTrigger className="flex w-full items-center justify-between text-left text-sm font-semibold text-fg">
          <span>{title}</span>
          <span className="text-xs font-semibold uppercase tracking-[0.26em] text-fg">
            {selected.size || 'All'}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent forceMount>
          <div className="mt-1 max-h-48 space-y-2 overflow-auto pr-1">
            {options.map((option) => {
              const id = `${title}-${String(option)}`;
              const isChecked = selected.has(option);
              return (
                <label
                  key={id}
                  htmlFor={id}
                  data-checked={isChecked}
                  className="filters-chip"
                >
                  <Checkbox
                    id={id}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(option)}
                    className="filters-checkbox shrink-0 data-[state=checked]:shadow-[0_10px_20px_-16px_rgba(79,70,229,0.6)]"
                  />
                  <span className={cn('truncate text-sm text-fg-muted', isChecked && 'text-[hsl(var(--accent))] font-medium')}>
                    {renderLabel ? renderLabel(option) : String(option)}
                  </span>
                </label>
              );
            })}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
