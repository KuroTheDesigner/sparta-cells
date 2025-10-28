import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from '@/components/ThemeToggle';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'system', setTheme }),
}));

describe('ThemeToggle', () => {
  it('has proper ARIA and toggles theme', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const group = screen.getByRole('group', { name: 'Select theme' });
    expect(group).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Light mode' }));
    await user.click(screen.getByRole('radio', { name: 'Dark mode' }));

    expect(setTheme).toHaveBeenCalledWith('light');
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});


