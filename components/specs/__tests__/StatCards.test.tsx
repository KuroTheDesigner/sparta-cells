import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { StatCards } from '@/components/specs/StatCards';
import type { StatBundle } from '@/lib/stats';

describe('StatCards', () => {
  it('renders empty guidance when stats is null', () => {
    render(<StatCards stats={null} />);
    expect(screen.getByText(/No phones match/)).toBeInTheDocument();
  });

  it('renders six cards in order with titles and values', () => {
    const stats: StatBundle = {
      battery: { title: 'Best Battery', value: '5000 mAh', phone: 'A' },
      charging: { title: 'Fastest Charging', value: '120 W', phone: 'B' },
      refresh: { title: 'Highest Refresh', value: '144 Hz', phone: 'C' },
      bestValue: { title: 'Best Value', value: '₦150,000', phone: 'D' },
      largestScreen: { title: 'Largest Screen', value: '6.9"', phone: 'E' },
      bestCamera: { title: 'Best Camera', value: '200 MP', phone: 'F' },
    };
    render(<StatCards stats={stats} />);
    const expectedTitles = [
      'Best Battery',
      'Fastest Charging',
      'Highest Refresh',
      'Best Value',
      'Largest Screen',
      'Best Camera',
    ];
    expect(screen.getAllByRole('heading').map((heading) => heading.textContent)).toEqual(expectedTitles);
    const expected = [stats.battery, stats.charging, stats.refresh, stats.bestValue, stats.largestScreen, stats.bestCamera];
    screen.getAllByRole('article').forEach((article, index) => {
      expect(within(article).getByText(expected[index].value)).toBeInTheDocument();
      expect(within(article).getByText(expected[index].phone)).toBeInTheDocument();
      expect(article).not.toHaveAttribute('tabindex');
    });
  });
});
