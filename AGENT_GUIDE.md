# Sparta Cells — Agent Guide

A Next.js 14 (App Router) app for fast, accessible smartphone spec comparison with powerful filters and stats.

## TL;DR
- Stack: Next.js 14, TypeScript (strict), Tailwind CSS, Radix UI primitives, next-themes, @tanstack/react-virtual, Zod.
- Main screen: `/compare` — filter phones and view a virtualized specs table + stat cards.
- Data source: `data/phones.raw.json` normalized via `lib/normalize.ts` into typed `Phone` objects (`lib/schema.ts`).
- Filters/state: `lib/filters.ts` (with localStorage persistence under key `sparta:filters`).
- Stats: `lib/stats.ts` computes “Best Battery”, “Fastest Charging”, etc.
- Tests: Unit (Vitest + Testing Library) and E2E (Playwright), plus a11y checks.

## How to run
- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:3000)
- Build: `npm run build` → Start: `npm start`

## Tests
- Type check: `npm run typecheck`
- Unit tests: `npm test`
- E2E tests: `npm run test:e2e` (first time, run `npx playwright install` to install browsers)
- All (type + unit + e2e): `npm run test:all`
- A11y E2E subset: `npm run test:a11y`

## Scripts (package.json)
- `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:e2e`, `test:e2e:headed`, `test:e2e:ui`, `test:a11y`, `test:e2e:chromium`, `test:all`.

## Directory map (key paths)
- `app/`
  - `app/layout.tsx` — Root layout + ThemeProvider
  - `app/page.tsx` — Marketing/home
  - `app/compare/page.tsx` — Core compare experience (client component)
- `components/`
  - `components/ThemeToggle.tsx`
  - `components/specs/FiltersPanel.tsx` — Filters UI (price, CPU, screen tech, etc.)
  - `components/specs/StatCards.tsx` — Summary stats tiles
  - `components/specs/SpecsTable.tsx` — Virtualized comparison table
  - `components/ui/*` — Radix-based primitives
- `lib/`
  - `lib/schema.ts` — Zod `Phone` schema and type
  - `lib/normalize.ts` — Parse `phones.raw.json` into `Phone[]`
  - `lib/filters.ts` — Filter state, options, (de)serialization, application helpers
  - `lib/stats.ts` — Aggregate stats for cards
  - `lib/format.ts` — Currency/number/camera formatting
  - `lib/cn.ts` — Classname helper
- `data/phones.raw.json` — Raw input dataset
- `tests/`
  - `tests/e2e/pages/compare.page.ts` — Playwright page object
  - `tests/e2e/*.spec.ts` — E2E suites (virtualization, stats, persistence, etc.)
- `lib/__tests__/` and `components/**/__tests__` — Vitest unit tests
- `docs/` — Additional documentation
- `modes/simple-chat.json` — Optional chat-mode metadata

## Core data flow
1. `app/compare/page.tsx` imports `data/phones.raw.json` and normalizes it via `normalizePhones`.
2. `lib/filters.ts` produces `FilterState` and options, persists selections in localStorage (key `sparta:filters`).
3. `applyFilters(phones, filters)` yields the visible phones.
4. `computeStats(visible)` feeds `StatCards`.
5. `SpecsTable` renders a horizontally virtualized table (`@tanstack/react-virtual`) when visible columns > 6.

## Important types and invariants
- `lib/schema.ts` defines `Phone` (price, cpu, batteryMah, screen, cameras, refreshHz, chargingW, wirelessW, etc.).
- `lib/normalize.ts` parses numeric values (battery, refresh, charging, cameras) and returns validated `Phone`s.
- Filters use `Set`; always replace with new `Set` instances via helpers like `toggleSet` instead of mutating.
- Guard `localStorage` access with `typeof window` to avoid SSR issues.

## UI details
- Styling: Tailwind (`tailwind.config.ts`) with design tokens in `app/globals.css`.
- Accessibility: Playwright a11y specs (`tests/e2e/a11y`) and `vitest-axe` integration.
- Theme: `next-themes` via `components/ThemeToggle.tsx`.

## Virtualization notes
- Enabled when visible phone columns > 6; falls back to full render for smaller sets.
- Column widths cached via ResizeObserver; cells retain `data-index` for testing.
- Sticky first column with gradient edges defined in CSS (`app/globals.css`).

## Path aliases (tsconfig.json)
- `@/components/*` → `components/*`
- `@/app/*` → `app/*`
- `@/lib/*` → `lib/*`
- `@/data/*` → `data/*`

## Where to change things
- Add or adjust filters: `lib/filters.ts` + `components/specs/FiltersPanel.tsx`.
- Add new stat: extend `lib/stats.ts` and update `components/specs/StatCards.tsx` + tests.
- Modify displayed specs: edit `SPECS` array in `components/specs/SpecsTable.tsx`.
- Update dataset: edit `data/phones.raw.json` and ensure normalization/tests pass.

## Linting & type safety
- ESLint config: `.eslintrc.json`
- TypeScript is strict; run `npm run typecheck`.

## Troubleshooting
- Hydration/SSR: ensure window-only code lives in client components and guards against SSR.
- “Attempted to assign to readonly property”: avoid mutating frozen props/state; use immutable helpers.
