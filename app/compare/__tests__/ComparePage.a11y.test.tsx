import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';

import ComparePage from '@/app/compare/page';

// Reuse the same dataset mock from the integration suite for determinism
vi.mock('@/data/phones.raw.json', () => ({
  default: [
    {
      name: 'Alpha',
      price: 200_000,
      cpu: 'Snapdragon',
      battery: '4500 mAh',
      screen: 'AMOLED',
      rearCam: '50MP (Wide)\n12MP (Ultrawide)',
      frontCam: '32MP',
      refresh: '120Hz',
      size: '6.5"',
      charging: '65W',
      video: '4K',
      wireless: 'Yes (30W)',
      resolution: '1080x2400',
      headphone: 'No',
      sim: 'Dual SIM',
    },
    {
      name: 'Bravo',
      price: 150_000,
      cpu: 'Dimensity',
      battery: '5000 mAh',
      screen: 'OLED',
      rearCam: '64MP (Wide)',
      frontCam: '20MP',
      refresh: '90Hz',
      size: '6.7"',
      charging: '33W',
      video: '4K',
      wireless: 'No',
      resolution: '1440x3200',
      headphone: 'Yes',
      sim: 'Dual SIM',
    },
  ],
}));

describe('ComparePage accessibility', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('has no axe violations', async () => {
    const { container } = render(<ComparePage />);
    const results = await axe(container, {
      rules: {
        // Disable color-contrast while design tokens settle; enable once palette locked
        'color-contrast': { enabled: false },
        // Headings/landmarks intentionally duplicated for sticky layout
        'landmark-unique': { enabled: false },
      },
    });
    expect(results.violations).toHaveLength(0);
  });
});


