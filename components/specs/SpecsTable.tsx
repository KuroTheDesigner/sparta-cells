import { useCallback, useEffect, useId, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { VirtualItem } from '@tanstack/react-virtual';
import type { Phone } from '@/lib/schema';
import type { PhoneEvidence } from '@/lib/ai/types';
import { PhoneImage } from '@/components/PhoneImage';
import { formatCamera, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/cn';
import './specs.css';

type SpecsTableProps = {
  phones: Phone[];
  visible: Phone[];
  evidence?: PhoneEvidence[];
  currency?: string;
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
  { key: 'cpu', label: 'CPU Model', render: (p) => p.cpu ?? 'Unknown' },
  {
    key: 'battery',
    label: 'Battery Size',
    render: (p) => p.batteryMah === null ? 'Unknown' : `${p.batteryMah} mAh`,
    metric: (p) => p.batteryMah,
    prefer: 'max',
  },
  { key: 'screen', label: 'Screen Technology', render: (p) => p.screen.tech ?? 'Unknown' },
  {
    key: 'rearCam',
    label: 'Rear Cameras',
    render: (p) => p.cameras.rear?.map((module) => formatCamera(module.mp, module.type)).join('\n') ?? 'Unknown',
    multiline: true,
    metric: (p) =>
      p.cameras.rear?.length
        ? Math.max(...p.cameras.rear.map((module) => module.mp ?? 0))
        : null,
    prefer: 'max',
  },
  {
    key: 'frontCam',
    label: 'Front Camera',
    render: (p) => p.cameras.frontMp === null ? 'Unknown' : formatCamera(p.cameras.frontMp),
    metric: (p) => p.cameras.frontMp,
    prefer: 'max',
  },
  {
    key: 'refresh',
    label: 'Refresh Rate',
    render: (p) => p.refreshHz === null ? 'Unknown' : `${p.refreshHz} Hz`,
    metric: (p) => p.refreshHz,
    prefer: 'max',
  },
  {
    key: 'size',
    label: 'Screen Size',
    render: (p) => p.screen.sizeIn === null ? 'Unknown' : `${p.screen.sizeIn}"`,
    metric: (p) => p.screen.sizeIn,
    prefer: 'max',
  },
  {
    key: 'charging',
    label: 'Charging Speed',
    render: (p) => p.chargingW === null ? 'Unknown' : `${p.chargingW} W`,
    metric: (p) => p.chargingW,
    prefer: 'max',
  },
  { key: 'video', label: 'Video Recording', render: (p) => p.video === null ? 'Unknown' : p.video || '—' },
  {
    key: 'wireless',
    label: 'Wireless Charging',
    render: (p) => p.wirelessW === null ? 'Unknown' : (p.wirelessW ? `Yes (${p.wirelessW} W)` : 'No'),
    metric: (p) => p.wirelessW,
    prefer: 'max',
  },
  { key: 'resolution', label: 'Resolution', render: (p) => p.screen.resolution ?? 'Unknown' },
  {
    key: 'headphone',
    label: '3.5mm Jack',
    render: (p) => p.features.headphone === null ? 'Unknown' : (p.features.headphone ? 'Yes' : 'No'),
    metric: (p) => p.features.headphone === null ? null : (p.features.headphone ? 1 : 0),
    prefer: 'max',
  },
  { key: 'sim', label: 'SIM', render: (p) => p.features.sim ?? 'Unknown' },
];

const ESTIMATED_COLUMN_WIDTH = 240;
const VIRTUALIZATION_MIN_COLUMNS = 6;

export function SpecsTable({ phones, visible, evidence, currency = 'NGN' }: SpecsTableProps) {
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
        className="sc-spec-empty"
        role="status"
        data-testid="specs-empty-state"
      >
        <p>No phones match the selected filters.</p>
        <p>Clear a filter or widen the price range to compare phones.</p>
      </div>
    );
  }

  return (
    <section className="sc-comparison">
      <div className="sc-comparison-note">
        <p>{orderedVisible.length} {orderedVisible.length === 1 ? 'model' : 'models'} in comparison</p>
        <p><span className="sc-best-key" aria-hidden="true" /> Highlighted cells lead on that specification.</p>
      </div>
    <div
      ref={scrollRef}
      className="sc-spec-scroll"
      role="region"
      aria-label="Phone comparison results"
      aria-describedby={scrollHintId}
      tabIndex={0}
      data-testid="specs-table-scroll"
      data-columns={orderedVisible.length}
    >
      <p id={scrollHintId} className="sc-scroll-hint">
        Scroll horizontally to review all models. Keyboard: focus this table, then use the arrow keys.
      </p>
      <table className="sc-spec-table" aria-colcount={orderedVisible.length + 1}>
        <caption className="sc-spec-sr-only">Phone specifications. Highlighted cells have the lowest price or highest numeric specification among the filtered models, including ties.</caption>
        <thead>
          <tr>
            <th scope="col" className="sc-spec-axis">
              Specification
            </th>
            {hasVirtualColumns && paddingStart > 0 && (
              <th
                aria-hidden
                className="sc-spec-spacer"
                style={{ width: paddingStart, minWidth: paddingStart, border: 'none' }}
              />
            )}
            {columnsToRender.map((column) => {
              const phone = orderedVisible[column.index];
              const phoneEvidence = evidence?.find((item) => item.name === phone.name);
              return (
                <th
                  key={phone.name}
                  ref={hasVirtualColumns ? measureColumn : undefined}
                  data-index={column.index}
                  scope="col"
                  aria-colindex={column.index + 2}
                  className="sc-model-heading"
                  style={
                    hasVirtualColumns
                      ? { width: column.size, minWidth: column.size }
                      : undefined
                  }
                >
                  {phoneEvidence?.imageUrl && phoneEvidence.imageSource && (
                    <div className="sc-model-thumbnail"><PhoneImage evidence={phoneEvidence} name={phone.name} /></div>
                  )}
                  {phone.name}
                </th>
              );
            })}
            {hasVirtualColumns && paddingEnd > 0 && (
              <th
                aria-hidden
                className="sc-spec-spacer"
                style={{ width: paddingEnd, minWidth: paddingEnd, border: 'none' }}
              />
            )}
          </tr>
        </thead>
        <tbody>
          {SPECS.map((spec) => {
            const winners = highlightWinners.get(spec.key);
            return (
              <tr key={spec.key} className="sc-spec-row">
                <th
                  scope="row"
                  className="sc-spec-axis"
                >
                  {spec.key === 'price' ? `Price (${currency})` : spec.label}
                </th>
                {hasVirtualColumns && paddingStart > 0 && (
                  <td
                    aria-hidden
                    className="sc-spec-spacer"
                    style={{ width: paddingStart, minWidth: paddingStart, border: 'none' }}
                  />
                )}
                {columnsToRender.map((column) => {
                  const phone = orderedVisible[column.index];
                  const cellValue = spec.key === 'price' ? formatCurrency(phone.price, currency) : spec.render(phone);
                  const isWinner = winners?.has(column.index) ?? false;
                  return (
                    <td
                      key={`${phone.name}-${spec.key}`}
                      data-index={column.index}
                      aria-colindex={column.index + 2}
                      className={cn(
                        'sc-spec-cell',
                        isWinner && 'sc-spec-winner'
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
                    className="sc-spec-spacer"
                    style={{ width: paddingEnd, minWidth: paddingEnd, border: 'none' }}
                  />
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    </section>
  );
}
