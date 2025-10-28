import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { Phone } from '@/lib/schema';
import { formatCamera, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';

type SpecsTableProps = {
  phones: Phone[];
  visible: Phone[];
};

type SpecDefinition = {
  key: string;
  label: string;
  render: (phone: Phone) => string;
  multiline?: boolean;
  metric?: (phone: Phone) => number | null;
  prefer?: 'max' | 'min';
};

const SPECS: SpecDefinition[] = [
  {
    key: 'price',
    label: 'Price (NGN)',
    render: (p) => formatCurrency(p.price),
    metric: (p) => p.price,
    prefer: 'min',
  },
  { key: 'cpu', label: 'CPU Model', render: (p) => p.cpu },
  {
    key: 'battery',
    label: 'Battery Size',
    render: (p) => `${p.batteryMah} mAh`,
    metric: (p) => p.batteryMah,
    prefer: 'max',
  },
  { key: 'screen', label: 'Screen Technology', render: (p) => p.screen.tech },
  {
    key: 'rearCam',
    label: 'Rear Cameras',
    render: (p) => p.cameras.rear.map((module) => formatCamera(module.mp, module.type)).join('\n'),
    multiline: true,
    metric: (p) =>
      p.cameras.rear.length
        ? Math.max(...p.cameras.rear.map((module) => module.mp ?? 0))
        : null,
    prefer: 'max',
  },
  {
    key: 'frontCam',
    label: 'Front Camera',
    render: (p) => formatCamera(p.cameras.frontMp),
    metric: (p) => (p.cameras.frontMp ?? 0),
    prefer: 'max',
  },
  {
    key: 'refresh',
    label: 'Refresh Rate',
    render: (p) => `${p.refreshHz} Hz`,
    metric: (p) => p.refreshHz,
    prefer: 'max',
  },
  {
    key: 'size',
    label: 'Screen Size',
    render: (p) => `${p.screen.sizeIn}"`,
    metric: (p) => p.screen.sizeIn,
    prefer: 'max',
  },
  {
    key: 'charging',
    label: 'Charging Speed',
    render: (p) => `${p.chargingW} W`,
    metric: (p) => p.chargingW,
    prefer: 'max',
  },
  { key: 'video', label: 'Video Recording', render: (p) => p.video || '—' },
  {
    key: 'wireless',
    label: 'Wireless Charging',
    render: (p) => (p.wirelessW ? `Yes (${p.wirelessW} W)` : 'No'),
    metric: (p) => (p.wirelessW ? p.wirelessW : 0),
    prefer: 'max',
  },
  { key: 'resolution', label: 'Resolution', render: (p) => p.screen.resolution },
  {
    key: 'headphone',
    label: '3.5mm Jack',
    render: (p) => (p.features.headphone ? 'Yes' : 'No'),
    metric: (p) => (p.features.headphone ? 1 : 0),
    prefer: 'max',
  },
  { key: 'sim', label: 'SIM', render: (p) => p.features.sim },
];

const ESTIMATED_COLUMN_WIDTH = 240;
const VIRTUALIZATION_MIN_COLUMNS = 6;

export function SpecsTable({ phones, visible }: SpecsTableProps) {
  const visibleNames = useMemo(() => new Set(visible.map((phone) => phone.name)), [visible]);
  const orderedVisible = useMemo(
    () => phones.filter((phone) => visibleNames.has(phone.name)),
    [phones, visibleNames]
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const widthCacheRef = useRef<Map<number, number>>(new Map());

  const virtualizationEnabled = orderedVisible.length > VIRTUALIZATION_MIN_COLUMNS;

  const columnVirtualizer = useVirtualizer({
    count: virtualizationEnabled ? orderedVisible.length : 0,
    horizontal: true,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => widthCacheRef.current.get(index) ?? ESTIMATED_COLUMN_WIDTH,
    overscan: 3,
    enabled: virtualizationEnabled,
    getItemKey: (index) => orderedVisible[index]?.name ?? index,
    initialRect: { width: 960, height: 0 },
  });

  const measureColumn = useCallback(
    (element: HTMLElement | null) => {
      if (!element) return;
      const indexAttr = element.getAttribute('data-index');
      if (indexAttr) {
        const index = Number(indexAttr);
        if (!Number.isNaN(index)) {
          widthCacheRef.current.set(index, element.getBoundingClientRect().width);
        }
      }
      columnVirtualizer.measureElement(element);
    },
    [columnVirtualizer]
  );

  useEffect(() => {
    if (!virtualizationEnabled) {
      widthCacheRef.current.clear();
      return;
    }

    const handleResize = () => columnVirtualizer.measure();
    window.addEventListener('resize', handleResize);

    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    const observer = new ResizeObserver(() => columnVirtualizer.measure());
    observer.observe(scrollElement);

    return () => {
      window.removeEventListener('resize', handleResize);
      observer.disconnect();
    };
  }, [columnVirtualizer, virtualizationEnabled]);

  const virtualColumns = virtualizationEnabled ? columnVirtualizer.getVirtualItems() : [];
  const hasVirtualColumns = virtualizationEnabled && virtualColumns.length > 0;
  const paddingStart = hasVirtualColumns ? virtualColumns[0].start : 0;
  const paddingEnd = hasVirtualColumns
    ? columnVirtualizer.getTotalSize() - virtualColumns[virtualColumns.length - 1].end
    : 0;
  const fallbackColumns = useMemo(
    () =>
      orderedVisible.map((phone, index) => ({
        index,
        key: phone.name,
        start: 0,
        end: ESTIMATED_COLUMN_WIDTH,
        size: ESTIMATED_COLUMN_WIDTH,
        lane: 0,
      }) satisfies VirtualItem),
    [orderedVisible]
  );
  const columnsToRender = hasVirtualColumns ? virtualColumns : fallbackColumns;

  const scrollHintId = useId();

  const highlightWinners = useMemo(() => {
    const map = new Map<string, Set<number>>();
    SPECS.forEach((spec) => {
      if (!spec.metric) return;
      const values = orderedVisible.map((phone) => spec.metric?.(phone));
      const numeric = values.filter((value): value is number => value !== null && value !== undefined && !Number.isNaN(value));
      if (!numeric.length) return;
      const target = (spec.prefer ?? 'max') === 'min' ? Math.min(...numeric) : Math.max(...numeric);
      const winners = new Set<number>();
      values.forEach((value, index) => {
        if (value === null || value === undefined || Number.isNaN(value)) return;
        const tolerance = Math.abs(target) > 1 ? 0.5 : 0.001;
        if (Math.abs(value - target) <= tolerance) {
          winners.add(index);
        }
      });
      if (winners.size) {
        map.set(spec.key, winners);
      }
    });
    return map;
  }, [orderedVisible]);

  if (!orderedVisible.length) {
    return (
      <div
        className="card p-6 text-center text-sm text-fg-muted/80"
        data-testid="specs-empty-state"
      >
        No phones match the selected filters.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="card scroll-mask overflow-x-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(var(--bg))]"
      role="region"
      aria-label="Phone comparison results"
      aria-describedby={scrollHintId}
      tabIndex={0}
      data-testid="specs-table-scroll"
      data-columns={orderedVisible.length}
    >
      <span id={scrollHintId} className="sr-only">
        Scroll horizontally to review all phone specifications.
      </span>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr>
            <th className="sticky left-0 z-20 bg-[hsl(var(--bg))] px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-fg-muted shadow-[inset_-1px_0_0_rgba(148,163,184,0.35)]">
              Specification
            </th>
            {hasVirtualColumns && paddingStart > 0 && (
              <th
                aria-hidden
                className="p-0"
                style={{ width: paddingStart, minWidth: paddingStart, border: 'none' }}
              />
            )}
            {columnsToRender.map((column) => {
              const phone = orderedVisible[column.index];
              return (
                <th
                  key={phone.name}
                  ref={hasVirtualColumns ? measureColumn : undefined}
                  data-index={column.index}
                  className="bg-gradient-to-r from-[hsl(var(--accent-from))/0.22] to-[hsl(var(--accent-to))/0.18] px-4 py-3 text-left text-sm font-semibold text-[hsl(var(--accent))] shadow-[0_14px_26px_-20px_rgba(79,70,229,0.6)]"
                  style={
                    hasVirtualColumns
                      ? { width: column.size, minWidth: column.size }
                      : undefined
                  }
                >
                  {phone.name}
                </th>
              );
            })}
            {hasVirtualColumns && paddingEnd > 0 && (
              <th
                aria-hidden
                className="p-0"
                style={{ width: paddingEnd, minWidth: paddingEnd, border: 'none' }}
              />
            )}
          </tr>
        </thead>
        <tbody>
          {SPECS.map((spec) => {
            const winners = highlightWinners.get(spec.key);
            return (
              <tr key={spec.key} className="specs-row border-t border-[hsl(var(--border))] align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[hsl(var(--bg))] px-4 py-3 text-left text-sm font-medium text-fg shadow-[inset_-1px_0_0_rgba(148,163,184,0.25)]"
                >
                  {spec.label}
                </th>
                {hasVirtualColumns && paddingStart > 0 && (
                  <td
                    aria-hidden
                    className="p-0"
                    style={{ width: paddingStart, minWidth: paddingStart, border: 'none' }}
                  />
                )}
                {columnsToRender.map((column) => {
                  const phone = orderedVisible[column.index];
                  const cellValue = spec.render(phone);
                  const isWinner = winners?.has(column.index) ?? false;
                  return (
                    <td
                      key={`${phone.name}-${spec.key}`}
                      data-index={column.index}
                      className={cn(
                        'px-4 py-3 text-sm text-fg-muted transition-colors duration-150 ease-out',
                        isWinner && 'specs-winner'
                      )}
                      style={{
                        ...(hasVirtualColumns
                          ? {
                              width: column.size,
                              minWidth: column.size,
                            }
                          : undefined),
                        ...(spec.multiline ? { whiteSpace: 'pre-line', lineHeight: 1.5 } : undefined),
                      }}
                      title={spec.multiline ? cellValue.replace(/\n/g, ' • ') : cellValue}
                    >
                      {cellValue}
                    </td>
                  );
                })}
                {hasVirtualColumns && paddingEnd > 0 && (
                  <td
                    aria-hidden
                    className="p-0"
                    style={{ width: paddingEnd, minWidth: paddingEnd, border: 'none' }}
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
