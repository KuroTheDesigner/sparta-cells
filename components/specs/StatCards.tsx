import type { StatBundle } from '@/lib/stats';
import './specs.css';

type StatCardsProps = {
  stats: StatBundle | null;
};

export function StatCards({ stats }: StatCardsProps) {
  if (!stats) {
    return (
      <div className="sc-spec-empty" role="status">
        <p>No phones match the current filters.</p>
        <p>Try expanding your criteria.</p>
      </div>
    );
  }

  const ordered = [stats.battery, stats.charging, stats.refresh, stats.bestValue, stats.largestScreen, stats.bestCamera];

  return (
    <div className="sc-stat-ledger" data-testid="stat-cards-grid">
      {ordered.map((stat) => (
        <article key={stat.title} className="sc-stat-entry">
          <h3>{stat.title}</h3>
          <p className="sc-stat-value">{stat.value}</p>
          <p className="sc-stat-phone">{stat.phone}</p>
        </article>
      ))}
    </div>
  );
}
