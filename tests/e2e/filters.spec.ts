import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare filters', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('search is case insensitive and narrows visible phones', async () => {
    const initialPhones = await compare.getVisiblePhones();
    const search = await compare.ensureSearchField();

    await search.fill('PIXEL');
    await expect(compare.getTable()).toContainText(/pixel/i);

    const filteredPhones = await compare.getVisiblePhones();
    expect(filteredPhones.length).toBeGreaterThan(0);
    filteredPhones.forEach((phone) => {
      expect(phone.toLowerCase()).toContain('pixel');
    });

    if (initialPhones.some((phone) => !/pixel/i.test(phone))) {
      expect(filteredPhones.length).toBeLessThan(initialPhones.length);
    }
  });

  test('price inputs clamp values and filter results accordingly', async () => {
    await compare.setPriceRange(600000, 300000);

    const minValue = Number(await compare.priceMinInput().inputValue());
    const maxValue = Number(await compare.priceMaxInput().inputValue());
    await compare.closeFiltersDrawer();

    expect(minValue).toBeLessThanOrEqual(maxValue);

    const prices = await compare.getSpecRowTexts('Price (NGN)');
    const phonePrices = prices.map(parseCurrency);

    phonePrices.forEach((price) => {
      expect(price).toBeGreaterThanOrEqual(minValue);
      expect(price).toBeLessThanOrEqual(maxValue);
    });
  });

  test('combining multiple filters shows only matching phones', async () => {
    await compare.toggleFilter('Snapdragon 8+ Gen 1');
    await compare.toggleFilter('120 W');
    await compare.toggleFilter('Yes');
    await compare.toggleFilter('120 Hz');

    const columnCount = await compare.getVisibleColumnCount();
    expect(columnCount).toBeGreaterThan(0);

    const cpuValues = await compare.getSpecRowTexts('CPU Model');
    cpuValues.forEach((value) => expect(value).toContain('Snapdragon 8+ Gen 1'));

    const chargingValues = await compare.getSpecRowTexts('Charging Speed');
    chargingValues.forEach((value) => expect(value).toContain('120 W'));

    const wirelessValues = await compare.getSpecRowTexts('Wireless Charging');
    wirelessValues.forEach((value) => expect(value).toMatch(/^Yes/));

    const refreshValues = await compare.getSpecRowTexts('Refresh Rate');
    refreshValues.forEach((value) => expect(value).toContain('120 Hz'));
  });

  test('clear button resets filters and restores initial results', async () => {
    await compare.openFiltersDrawer();
    const initialMin = Number(await compare.priceMinInput().inputValue());
    const initialMax = Number(await compare.priceMaxInput().inputValue());
    await compare.closeFiltersDrawer();
    const initialColumns = await compare.getVisibleColumnCount();

    const search = await compare.ensureSearchField();
    await search.fill('Pixel');
    await compare.toggleFilter('Snapdragon 8+ Gen 1');
    await compare.setPriceRange(250000, 300000);

    await compare.clearFilters();
    await compare.waitForTableToRender();

    const resetSearch = await compare.ensureSearchField();
    expect(await resetSearch.inputValue()).toBe('');

    await compare.openFiltersDrawer();
    const resetColumns = await compare.getVisibleColumnCount();
    expect(resetColumns).toBe(initialColumns);

    const minValue = Number(await compare.priceMinInput().inputValue());
    const maxValue = Number(await compare.priceMaxInput().inputValue());
    expect(minValue).toBe(initialMin);
    expect(maxValue).toBe(initialMax);
    await compare.closeFiltersDrawer();
  });
});

function parseCurrency(value: string): number {
  const digits = value.replace(/[^0-9.]/g, '');
  return Number(digits);
}
