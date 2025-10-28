"use client";

import { useMemo, useState, useLayoutEffect } from 'react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FiltersPanel } from '@/components/specs/FiltersPanel';
import { StatCards } from '@/components/specs/StatCards';
import { SpecsTable } from '@/components/specs/SpecsTable';
import rawPhones from '@/data/phones.raw.json';
import { normalizePhones } from '@/lib/normalize';
import { cn } from '@/lib/cn';
import {
  applyFilters,
  buildFilterOptions,
  createInitialFilters,
  deserializeFilters,
  serializeFilters,
  toggleSet,
  type FilterOptions,
  type FilterState,
  type WirelessOption,
} from '@/lib/filters';
import { computeStats } from '@/lib/stats';

const STORAGE_KEY = 'sparta:filters';
type ToggleableKey = 'cpu' | 'batteryMah' | 'screenTech' | 'refreshHz' | 'chargingW' | 'wireless';

export default function ComparePage() {
  const [phones] = useState(() => normalizePhones(rawPhones as any));
  const filterOptions = useMemo<FilterOptions>(() => buildFilterOptions(phones), [phones]);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const initialFilters = useMemo(() => createInitialFilters(phones), [phones]);
  const [filters, setFilters] = useState<FilterState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return deserializeFilters(JSON.parse(saved), initialFilters);
        }
      } catch {
        // ignore invalid stored data on first load
      }
    }
    return initialFilters;
  });

  const persistFilters = (next: FilterState) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeFilters(next)));
    } catch {
      // ignore persistence failures
    }
  };

  const updateFilters = (updater: (prev: FilterState) => FilterState) => {
    setFilters((prev) => {
      const next = updater(prev);
      persistFilters(next);
      return next;
    });
  };

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        persistFilters(initialFilters);
        return;
      }
      const restored = deserializeFilters(JSON.parse(saved), initialFilters);
      setFilters((prev) => {
        const prevSerialized = JSON.stringify(serializeFilters(prev));
        const restoredSerialized = JSON.stringify(serializeFilters(restored));
        if (prevSerialized === restoredSerialized) {
          persistFilters(prev);
          return prev;
        }
        persistFilters(restored);
        return restored;
      });
    } catch {
      // ignore malformed persisted data
      persistFilters(initialFilters);
    }
  }, [initialFilters]);

  const visible = useMemo(() => applyFilters(phones, filters), [phones, filters]);
  const stats = useMemo(() => computeStats(visible), [visible]);

  const handleToggle = (key: ToggleableKey, value: string | number | WirelessOption) => {
    updateFilters((prev) => ({
      ...prev,
      [key]: toggleSet(prev[key] as Set<string | number | WirelessOption>, value) as FilterState[ToggleableKey],
    }));
  };

  const handleQuery = (query: string) => updateFilters((prev) => ({ ...prev, query }));
  const handlePrice = (range: [number, number]) => {
    const [min, max] = range;
    const next: [number, number] = [Math.min(min, max), Math.max(min, max)];
    updateFilters((prev) => ({ ...prev, priceRange: next }));
  };
  const handleReset = () => updateFilters(() => createInitialFilters(phones));

  return (
    <main className="min-h-screen bg-[hsl(var(--bg))]">
      <header
        data-testid="app-header"
        className="sticky top-0 z-50 border-b border-[hsl(var(--border))]/40 bg-[hsl(var(--bg))/0.85] shadow-[0_32px_64px_-48px_rgba(79,70,229,0.35)] backdrop-blur-xl"
      >
        <div className="container relative flex items-center gap-4 py-4">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--accent-from))/0.5] to-transparent" aria-hidden="true" />
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.28em] shadow-[0_12px_20px_-18px_rgba(15,23,42,0.25)] transition-colors md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open filters"
          >
            ☰<span className="tracking-normal">Filters</span>
          </button>
          <div className="flex flex-col gap-1 md:pl-0">
            <div className="text-lg font-semibold tracking-tight text-fg">Sparta Cells — Compare</div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fg">Crafted matchups for power users</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <input
              className="hidden w-72 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-sm shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]/50 sm:block"
              placeholder="Search phones..."
              value={filters.query}
              onChange={(event) => handleQuery(event.target.value)}
              aria-label="Search phones"
            />
            <button
              className="hidden items-center gap-2 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--bg))] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] shadow-[0_12px_24px_-20px_rgba(15,23,42,0.2)] transition-colors hover:border-[hsl(var(--accent-from))/0.45] md:inline-flex"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              {sidebarOpen ? 'Hide filters' : 'Show filters'}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden',
          sidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-80 max-w-full overflow-y-auto border-r border-[hsl(var(--border))] bg-[hsl(var(--bg))] p-4 shadow-lg transition-transform md:hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="mb-4 flex items-center justify-between md:hidden">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Filters</h2>
          <button className="text-sm text-[hsl(var(--accent))]" onClick={() => setSidebarOpen(false)}>Close</button>
        </div>
        <FiltersPanel
          filters={filters}
          options={filterOptions}
          onReset={handleReset}
          onQueryChange={handleQuery}
          onPriceChange={handlePrice}
          onToggle={(key, value) => handleToggle(key, value)}
        />
      </aside>

      <div
        className={cn(
          'container grid gap-6 py-6',
          sidebarOpen ? 'md:grid-cols-[320px_1fr]' : 'md:grid-cols-1'
        )}
      >
        <aside
          className={cn(
            'card h-max min-w-0 p-4 md:sticky md:top-24 md:block',
            sidebarOpen ? 'hidden md:block' : 'hidden'
          )}
        >
          <FiltersPanel
            filters={filters}
            options={filterOptions}
            onReset={handleReset}
            onQueryChange={handleQuery}
            onPriceChange={handlePrice}
            onToggle={(key, value) => handleToggle(key, value)}
          />
        </aside>

        <section className="space-y-6 min-w-0">
          <div className="flex justify-end md:hidden">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="rounded-xl border border-[hsl(var(--border))] px-3 py-2 text-sm"
            >
              {sidebarOpen ? 'Hide filters' : 'Show filters'}
            </button>
          </div>
          <StatCards stats={stats} />
          <SpecsTable phones={phones} visible={visible} />
        </section>
      </div>
    </main>
  );
}
