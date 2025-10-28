import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ComparePage from '@/app/compare/page';

// Mock next-themes to avoid needing a provider
vi.mock('next-themes', () => {
  return {
    useTheme: () => ({ theme: 'dark', setTheme: vi.fn() }),
  };
});

// Provide a tiny, deterministic dataset
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

const STORAGE_KEY = 'sparta:filters';

describe('ComparePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders and shows table with both phones', () => {
    render(<ComparePage />);
    expect(screen.getByText('Sparta Cells — Compare')).toBeInTheDocument();

    const table = screen.getByRole('table');
    const headers = within(table).getAllByRole('columnheader');
    // First sticky header is "Specification"
    const headerText = headers.map((h) => h.textContent?.trim());
    expect(headerText).toEqual(expect.arrayContaining(['Specification', 'Alpha', 'Bravo']));
  });

  it('search narrows visible phones and updates cards', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search phones' });
    await user.clear(search);
    await user.type(search, 'alpha');

    const table = screen.getByRole('table');
    // Only Alpha column remains
    expect(within(table).queryByText('Bravo')).not.toBeInTheDocument();
    expect(within(table).getByText('Alpha')).toBeInTheDocument();

    // StatCards should reference Alpha somewhere; be tolerant of multiple
    expect(screen.getAllByText(/Alpha/).length).toBeGreaterThan(0);
  });

  it('toggles sidebar visibility text between Hide/Show filters', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    // Desktop header toggle has md:inline-flex; prefer that instance
    const toggles = screen.getAllByRole('button', { name: /hide filters/i });
    const toggle = toggles.find((el) => el.className.includes('md:inline-flex')) ?? toggles[0];
    await user.click(toggle);
    const shows = screen.getAllByRole('button', { name: /show filters/i });
    expect(shows.length).toBeGreaterThan(0);
  });

  it('price change above max can exclude all phones (empty state)', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const minInput = screen.getAllByLabelText('Minimum price')[0] as HTMLInputElement;
    await user.clear(minInput);
    await user.type(minInput, '300000');

    expect(screen.getByText(/No phones match the current filters/i)).toBeInTheDocument();
  });

  it('clear button resets filters including search', async () => {
    const user = userEvent.setup();
    render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search phones' });
    await user.type(search, 'alpha');

    const [clear] = screen.getAllByRole('button', { name: 'Clear' });
    await user.click(clear);
    expect((search as HTMLInputElement).value).toBe('');
  });

  it('persists filters to localStorage and restores on remount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ComparePage />);

    const search = screen.getByRole('textbox', { name: 'Search phones' });
    await user.type(search, 'alpha');

    // Unmount and re-mount; state should rehydrate from storage
    unmount();
    render(<ComparePage />);

    const restored = screen.getByRole('textbox', { name: 'Search phones' }) as HTMLInputElement;
    expect(restored.value.toLowerCase()).toBe('alpha');

    // Sanity: localStorage has the key
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });
});


