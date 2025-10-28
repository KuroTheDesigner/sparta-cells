import type { ComponentType } from 'react';
import { LapTimerIcon, LightningBoltIcon, ReloadIcon, StarIcon, DimensionsIcon, CameraIcon } from '@radix-ui/react-icons';
import type { StatBundle } from '@/lib/stats';

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  'Best Battery': LapTimerIcon,
  'Fastest Charging': LightningBoltIcon,
  'Highest Refresh': ReloadIcon,
  'Best Value': StarIcon,
  'Largest Screen': DimensionsIcon,
  'Best Camera': CameraIcon,
};

type StatCardsProps = {
  stats: StatBundle | null;
};

export function StatCards({ stats }: StatCardsProps) {
  if (!stats) {
    return (
      <div className="card flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-fg-muted/80">
        <span>No phones match the current filters.</span>
        <span>Try expanding your criteria.</span>
      </div>
    );
  }

  const ordered = [
    stats.battery,
    stats.charging,
    stats.refresh,
    stats.bestValue,
    stats.largestScreen,
    stats.bestCamera,
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="stat-cards-grid">
      {ordered.map((stat) => (
        <article key={stat.title} className="stat-card focus-within:outline-none" tabIndex={0}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-[0.26em] text-fg-muted">{stat.title}</h3>
              <p className="text-2xl font-semibold text-[hsl(var(--accent))]">{stat.value}</p>
              <p className="text-sm text-fg-muted">{stat.phone}</p>
            </div>
            <span className="stat-card-icon" aria-hidden="true">
              {(() => {
                const Icon = ICON_MAP[stat.title] ?? StarIcon;
                return <Icon className="h-5 w-5" />;
              })()}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
