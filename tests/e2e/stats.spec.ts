import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare stats accuracy', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('stat cards reflect the full dataset', async () => {
    await assertStatsMatchTable(compare);
  });

  test('stat cards update after applying filters', async () => {
    await compare.toggleFilter('Snapdragon 8+ Gen 1');
    await compare.toggleFilter('Yes');
    await compare.toggleFilter('120 Hz');
    await compare.waitForTableToRender();

    await assertStatsMatchTable(compare);
  });
});

async function assertStatsMatchTable(compare: ComparePage) {
  const phones = await compare.getVisiblePhones();
  expect(phones.length).toBeGreaterThan(0);

  const statSummaries = await compare.getVisibleStatSummaries();
  const titles = statSummaries.map((summary) => summary.title);

  expect(titles).toEqual([
    'Best Battery',
    'Fastest Charging',
    'Highest Refresh',
    'Best Value',
    'Largest Screen',
    'Best Camera',
  ]);

  await expectStat(compare, statSummaries, 'Best Battery', 'Battery Size', formatMah);
  await expectStat(compare, statSummaries, 'Fastest Charging', 'Charging Speed', formatWatt);
  await expectStat(compare, statSummaries, 'Highest Refresh', 'Refresh Rate', formatHz);
  await expectStat(compare, statSummaries, 'Largest Screen', 'Screen Size', formatInches);
  await expectBestValue(compare, statSummaries);
  await expectBestCamera(compare, statSummaries);
}

async function expectStat(
  compare: ComparePage,
  statSummaries: Array<{ title: string; value: string; phone: string }>,
  title: string,
  specLabel: string,
  format: (value: number) => string
) {
  const names = await compare.getVisiblePhones();
  const values = await compare.getSpecRowTexts(specLabel);
  const numericValues = values.map(parseNumeric);

  const bestIndex = findMaxIndex(numericValues);
  const expectedPhone = names[bestIndex];
  const expectedValue = format(numericValues[bestIndex]);

  const stat = statSummaries.find((summary) => summary.title === title);
  expect(stat).toBeDefined();
  expect(stat?.phone).toBe(expectedPhone);
  expect(normalize(stat?.value ?? '')).toBe(normalize(expectedValue));
}

async function expectBestValue(
  compare: ComparePage,
  statSummaries: Array<{ title: string; value: string; phone: string }>
) {
  const names = await compare.getVisiblePhones();
  const values = await compare.getSpecRowTexts('Price (NGN)');
  const numericValues = values.map(parseCurrency);

  let bestIndex = 0;
  let bestValue = numericValues[0];
  for (let index = 1; index < numericValues.length; index += 1) {
    if (numericValues[index] < bestValue) {
      bestValue = numericValues[index];
      bestIndex = index;
    }
  }

  const stat = statSummaries.find((summary) => summary.title === 'Best Value');
  expect(stat).toBeDefined();
  expect(stat?.phone).toBe(names[bestIndex]);
  expect(normalize(stat?.value ?? '')).toBe(normalize(formatCurrency(bestValue)));
}

async function expectBestCamera(
  compare: ComparePage,
  statSummaries: Array<{ title: string; value: string; phone: string }>
) {
  const names = await compare.getVisiblePhones();
  const record = await compare.getSpecRowRecord('Rear Cameras');

  const stat = statSummaries.find((summary) => summary.title === 'Best Camera');
  expect(stat).toBeDefined();

  expect(stat?.phone).toBeDefined();
  const cellText = record[stat!.phone];
  expect(cellText).toBeDefined();
  expect(cellText).toContain(stat!.value);
}

function findMaxIndex(numbers: number[]): number {
  let bestIndex = 0;
  let bestValue = numbers[0];
  for (let index = 1; index < numbers.length; index += 1) {
    if (numbers[index] > bestValue) {
      bestValue = numbers[index];
      bestIndex = index;
    }
  }
  return bestIndex;
}

function parseNumeric(value: string): number {
  const digits = value.replace(/[^0-9.]/g, '');
  return Number(digits);
}

function parseCurrency(value: string): number {
  const digits = value.replace(/[^0-9.]/g, '');
  return Number(digits);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMah(value: number): string {
  return `${value} mAh`;
}

function formatWatt(value: number): string {
  return `${value} W`;
}

function formatHz(value: number): string {
  return `${value} Hz`;
}

function formatInches(value: number): string {
  return `${value}"`;
}

function normalize(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}
