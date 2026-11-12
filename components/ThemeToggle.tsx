"use client";
import { useTheme } from "next-themes";
import * as ToggleGroup from "@radix-ui/react-toggle-group";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <ToggleGroup.Root
      type="single"
      value={theme ?? "light"}
      onValueChange={(value) => value && setTheme(value)}
      aria-label="Select theme"
      className="sc-theme"
    >
      <ToggleGroup.Item value="light" aria-label="Light mode">
        <SunIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="dark" aria-label="Dark mode">
        <MoonIcon />
      </ToggleGroup.Item>
      <ToggleGroup.Item value="system" aria-label="System theme">
        OS
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
}
