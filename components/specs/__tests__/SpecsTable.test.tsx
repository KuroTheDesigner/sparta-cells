import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { SpecsTable } from '@/components/specs/SpecsTable';
import type { Phone } from '@/lib/schema';
import type { PhoneEvidence } from '@/lib/ai/types';

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

  it('retains all specification rows, dataset order, and winner comparisons after filtering', () => {
    const beta: Phone = { ...alpha, name: 'Beta', price: 100000, batteryMah: 5000 };
    render(<SpecsTable phones={[alpha, beta]} visible={[beta, alpha]} />);
    const headers = screen.getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual(['Specification', 'Alpha', 'Beta']);
    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Price (NGN)', 'CPU Model', 'Battery Size', 'Screen Technology', 'Rear Cameras', 'Front Camera',
      'Refresh Rate', 'Screen Size', 'Charging Speed', 'Video Recording', 'Wireless Charging',
      'Resolution', '3.5mm Jack', 'SIM',
    ]);
    const priceRow = screen.getByRole('rowheader', { name: 'Price (NGN)' }).closest('tr')!;
    const cells = within(priceRow).getAllByRole('cell');
    expect(cells[0]).not.toHaveClass('sc-spec-winner');
    expect(cells[1]).toHaveClass('sc-spec-winner');
    const refreshRow = screen.getByRole('rowheader', { name: 'Refresh Rate' }).closest('tr')!;
    within(refreshRow).getAllByRole('cell').forEach((cell) => expect(cell).toHaveClass('sc-spec-winner'));
  });

  it('exposes the full column count and keyboard scroll region for large comparisons', () => {
    const phones = Array.from({ length: 12 }, (_, i) => ({ ...alpha, name: `Model ${i}` }));
    render(<SpecsTable phones={phones} visible={phones} />);
    const region = screen.getByRole('region', { name: 'Phone comparison results' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region).toHaveAttribute('data-columns', '12');
    expect(region).toHaveAccessibleDescription(/arrow keys/);
    expect(screen.getByRole('table')).toHaveAttribute('aria-colcount', '13');
    const header = screen.getAllByRole('columnheader').find((cell) => cell.textContent === 'Model 0');
    expect(header).toHaveAttribute('aria-colindex', '2');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });


  it('uses only exact-name evidence for model thumbnails', () => {
    const image: PhoneEvidence = {
      name: 'Alpha Pro', currency: 'NGN', sources: [], notes: '',
      imageUrl: 'https://www.apple.com/alpha.jpg', imageSource: { title: 'Product photo', url: 'https://www.apple.com/alpha' },
    };
    const { rerender } = render(<SpecsTable phones={[alpha]} visible={[alpha]} evidence={[image]} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(<SpecsTable phones={[alpha]} visible={[alpha]} evidence={[{ ...image, name: 'Alpha' }]} />);
    expect(screen.getByRole('img', { name: 'Alpha' })).toHaveAttribute('src', image.imageUrl);
    expect(screen.getByRole('link', { name: 'Photo source' })).toHaveAttribute('href', image.imageSource!.url);
  });

  it('shows unknown values without converting them to No, zero or a winning specification', () => {
    const known={...alpha,wirelessW:0,features:{...alpha.features,headphone:false}};
    const unknown={...alpha,name:'Unknown specs',batteryMah:null,wirelessW:null,features:{...alpha.features,headphone:null}};
    render(<SpecsTable phones={[known,unknown]} visible={[known,unknown]}/>);
    for(const label of ['Wireless Charging','3.5mm Jack']){
      const row=screen.getByRole('rowheader',{name:label}).closest('tr')!;
      const cells=within(row).getAllByRole('cell');
      expect(cells[0]).toHaveTextContent('No'); expect(cells[1]).toHaveTextContent('Unknown');
      expect(cells[1]).not.toHaveClass('sc-spec-winner');
    }
    const row=screen.getByRole('rowheader',{name:'Battery Size'}).closest('tr')!;
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('Unknown');
  });
});
