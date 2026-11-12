"use client";

import { useEffect, useId, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { type FilterState, type FilterOptions, type WirelessOption } from '@/lib/filters';
import { formatCurrency as money } from '@/lib/format';
import './specs.css';

type ToggleableKeys = 'cpu' | 'batteryMah' | 'screenTech' | 'refreshHz' | 'chargingW' | 'wireless';

type FiltersPanelProps = {
  filters: FilterState;
  currency?: string;
  options: FilterOptions;
  onReset: () => void;
  onQueryChange: (value: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onToggle: (key: ToggleableKeys, value: string | number | WirelessOption) => void;
};

export function FiltersPanel({ filters, options, onReset, onQueryChange, onPriceChange, onToggle, currency = 'NGN' }: FiltersPanelProps) {
  const formatCurrency = (value: number) => money(value, currency);
  const id = useId().replace(/:/g, '');
  const [resetCount, setResetCount] = useState(0);
  const [minPrice, maxPrice] = filters.priceRange;
  const [minDraft, setMinDraft] = useState(String(minPrice));
  const [maxDraft, setMaxDraft] = useState(String(maxPrice));
  useEffect(() => {
    setMinDraft(String(minPrice));
    setMaxDraft(String(maxPrice));
  }, [minPrice, maxPrice, resetCount]);
  const reset = () => {
    setResetCount((count) => count + 1);
    onReset();
  };

  return (
    <div className="sc-filters" data-testid="filters-panel">
      <header className="sc-filters-header">
        <h2>Filters</h2>
        <button type="button" onClick={reset} className="sc-filter-reset">Clear</button>
      </header>
      <div className="sc-filter-search">
        <label htmlFor={`${id}-search`}>Search all specifications</label>
        <input
          id={`${id}-search`}
          type="text"
          className="sc-spec-input"
          placeholder="Search phones..."
          value={filters.query}
          onChange={(event) => onQueryChange(event.target.value)}
          aria-describedby={`${id}-search-help`}
        />
        <p id={`${id}-search-help`} className="sc-field-help">Search models, processors, cameras and more.</p>
      </div>
      <fieldset className="sc-price-filter">
        <legend>Price range <span>{currency}</span></legend>
        <p className="sc-price-summary">{options.priceCount === 0 ? 'No sourced prices' : `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`}</p>
        {options.priceCount !== 0 && <>
        <Slider.Root
          className="sc-price-slider"
          min={options.priceRange[0]}
          max={options.priceRange[1]}
          value={[minPrice, maxPrice]}
          step={Math.max(1, Math.min(5000, 10 ** Math.floor(Math.log10((options.priceRange[1] - options.priceRange[0]) / 100 || 1))))}
          disabled={options.priceRange[0] === options.priceRange[1]}
          onValueChange={(value) => onPriceChange(value as [number, number])}
        >
          <Slider.Track className="sc-price-track"><Slider.Range className="sc-price-active" /></Slider.Track>
          <Slider.Thumb className="sc-price-thumb" aria-label="Minimum price slider" aria-valuetext={formatCurrency(minPrice)} />
          <Slider.Thumb className="sc-price-thumb" aria-label="Maximum price slider" aria-valuetext={formatCurrency(maxPrice)} />
        </Slider.Root>
        <div className="sc-price-limits" aria-hidden="true">
          <span>{formatCurrency(options.priceRange[0])}</span><span>{formatCurrency(options.priceRange[1])}</span>
        </div>
        <div className="sc-price-inputs">
          <label htmlFor={`${id}-min`}>Minimum
            <input id={`${id}-min`} type="number" className="sc-spec-input" value={minDraft}
              min={options.priceRange[0]} max={maxPrice} aria-label="Minimum price"
              onChange={(event) => setMinDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              onBlur={() => {
                const value = Number(minDraft) || options.priceRange[0];
                setMinDraft(String(value));
                onPriceChange([value, Math.max(value, maxPrice)]);
              }} />
          </label>
          <label htmlFor={`${id}-max`}>Maximum
            <input id={`${id}-max`} type="number" className="sc-spec-input" value={maxDraft}
              min={minPrice} max={options.priceRange[1]} aria-label="Maximum price"
              onChange={(event) => setMaxDraft(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              onBlur={() => {
                const value = Number(maxDraft) || options.priceRange[1];
                setMaxDraft(String(value));
                onPriceChange([Math.min(minPrice, value), value]);
              }} />
          </label>
        </div>
        <p className="sc-field-help">Phones with unavailable prices are excluded when you adjust this range.</p>
        </>}
      </fieldset>
      <FilterSection key={`cpu-${resetCount}`} title="CPU" options={options.cpu} selected={filters.cpu} onToggle={(value) => onToggle('cpu', value)} />
      <FilterSection key={`screen-${resetCount}`} title="Screen Technology" options={options.screenTech} selected={filters.screenTech} onToggle={(value) => onToggle('screenTech', value)} />
      <FilterSection key={`battery-${resetCount}`} title="Battery (mAh)" options={options.batteryMah} selected={filters.batteryMah} onToggle={(value) => onToggle('batteryMah', value)} renderLabel={(value) => `${value} mAh`} />
      <FilterSection key={`refresh-${resetCount}`} title="Refresh Rate (Hz)" options={options.refreshHz} selected={filters.refreshHz} onToggle={(value) => onToggle('refreshHz', value)} renderLabel={(value) => `${value} Hz`} />
      <FilterSection key={`charging-${resetCount}`} title="Charging Speed (W)" options={options.chargingW} selected={filters.chargingW} onToggle={(value) => onToggle('chargingW', value)} renderLabel={(value) => `${value} W`} />
      <FilterSection key={`wireless-${resetCount}`} title="Wireless Charging" options={options.wireless} selected={filters.wireless} onToggle={(value) => onToggle('wireless', value)} />
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
  const id = useId().replace(/:/g, '');
  const [query, setQuery] = useState('');
  if (!options.length) return null;
  const label = (value: T) => renderLabel ? renderLabel(value) : String(value);
  const matching = options.filter((option) => label(option).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Collapsible defaultOpen className="sc-filter-section">
      <CollapsibleTrigger className="sc-filter-trigger" aria-controls={`${id}-options`}>
        <span>{title}</span>
        <span className="sc-filter-count" aria-label={`${selected.size} of ${options.length} options selected`}>
          {selected.size ? `${selected.size} selected` : `All ${options.length}`}
        </span>
        <ChevronDownIcon aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent id={`${id}-options`} className="sc-filter-content">
        {options.length > 1 && (
          <div className="sc-option-search">
            <label htmlFor={`${id}-search`} className="sc-spec-sr-only">Search {title} options</label>
            <input id={`${id}-search`} type="search" className="sc-spec-input" placeholder="Find an option…" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        )}
        <div className="sc-filter-options" role="group" aria-label={title} tabIndex={0}>
          {matching.map((option, index) => (
            <label key={String(option)} htmlFor={`${id}-${index}`} data-checked={selected.has(option)} className="sc-filter-option">
              <Checkbox id={`${id}-${index}`} checked={selected.has(option)} onCheckedChange={() => onToggle(option)} className="sc-filter-checkbox" />
              <span>{label(option)}</span>
            </label>
          ))}
          {!matching.length && <p className="sc-option-empty" role="status">No options match “{query}”. Try another term.</p>}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
