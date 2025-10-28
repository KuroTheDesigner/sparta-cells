"use client";
import { useTheme } from 'next-themes';
import * as ToggleGroup from '@radix-ui/react-toggle-group';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <ToggleGroup.Root
      type="single"
      value={theme ?? 'system'}
      onValueChange={(value) => value && setTheme(value)}
      aria-label="Select theme"
      className="inline-flex items-center gap-1 rounded-2xl border border-[hsl(var(--border))]/60 bg-[hsl(var(--bg))/0.9] p-1 shadow-[0_16px_32px_-26px_rgba(79,70,229,0.2)] backdrop-blur-sm transition-all duration-300 ease-out focus-within:ring-2 focus-within:ring-[hsl(var(--accent))]/60 focus-within:ring-offset-2 focus-within:ring-offset-[hsl(var(--bg))]"
    >
      <ToggleGroup.Item
        value="light"
        className="rounded-xl px-3 py-1.5 text-xs font-medium text-fg-muted transition-all duration-200 hover:text-fg data-[state=on]:bg-[hsl(var(--accent))] data-[state=on]:text-[hsl(var(--accent-fg))] data-[state=on]:shadow-[0_14px_24px_-16px_rgba(79,70,229,0.7)] data-[state=on]:hover:text-[hsl(var(--accent-fg))]"
        aria-label="Light mode"
      >
        <SunIcon className="h-4 w-4" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value="dark"
        className="rounded-xl px-3 py-1.5 text-xs font-medium text-fg-muted transition-all duration-200 hover:text-fg data-[state=on]:bg-[hsl(var(--accent))] data-[state=on]:text-[hsl(var(--accent-fg))] data-[state=on]:shadow-[0_14px_24px_-16px_rgba(79,70,229,0.7)] data-[state=on]:hover:text-[hsl(var(--accent-fg))]"
        aria-label="Dark mode"
      >
        <MoonIcon className="h-4 w-4" />
      </ToggleGroup.Item>
      <ToggleGroup.Item
        value="system"
        className="rounded-xl px-3 py-1.5 text-xs font-medium text-fg-muted transition-all duration-200 hover:text-fg data-[state=on]:bg-[hsl(var(--accent))] data-[state=on]:text-[hsl(var(--accent-fg))] data-[state=on]:shadow-[0_14px_24px_-16px_rgba(79,70,229,0.7)] data-[state=on]:hover:text-[hsl(var(--accent-fg))]"
        aria-label="System theme"
      >
        OS
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
