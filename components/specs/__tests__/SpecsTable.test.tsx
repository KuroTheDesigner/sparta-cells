import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SpecsTable } from '@/components/specs/SpecsTable';
import type { Phone } from '@/lib/schema';

const alpha: Phone = {
  name: 'Alpha',
  price: 200000,
  cpu: 'Snapdragon',
  batteryMah: 4500,
  screen: { tech: 'AMOLED', sizeIn: 6.5, resolution: '1080x2400' },
  cameras: { rear: [{ mp: 50, type: 'Wide' }, { mp: 12, type: 'Ultrawide' }], frontMp: 32 },
  refreshHz: 120,
  chargingW: 65,
  wirelessW: 30,
  video: '4K',
  features: { headphone: false, sim: 'Dual SIM' },
};

describe('SpecsTable', () => {
  it('shows empty state when no visible phones', () => {
    render(<SpecsTable phones={[alpha]} visible={[]} />);
    expect(screen.getByText(/No phones match/)).toBeInTheDocument();
  });

  it('renders headers and multiline rear cameras', () => {
    render(<SpecsTable phones={[alpha]} visible={[alpha]} />);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Specification')).toBeInTheDocument();
    expect(within(table).getByText('Alpha')).toBeInTheDocument();
    // Multiline rear cameras should render as two lines
    const rear = within(table).getByText(/50 MP/);
    expect(rear).toBeInTheDocument();
  });

  it('shows Wireless Charging row text correctly', () => {
    render(<SpecsTable phones={[alpha]} visible={[alpha]} />);
    expect(screen.getByText(/Yes \(30 W\)/)).toBeInTheDocument();
  });
});



