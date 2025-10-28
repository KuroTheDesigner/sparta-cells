import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare robustness', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('shows empty state when filters exclude all phones', async () => {
    const search = await compare.ensureSearchField();
    await search.fill('no-such-phone');
    await expect(compare.getNoResultsNotice()).toBeVisible();
  });

  test('toggling a filter twice returns to initial state', async () => {
    await compare.openFiltersDrawer();
    const checkbox = compare.getCheckbox('Snapdragon 8 Gen 1');
    await checkbox.click();
    await expect(checkbox).toHaveAttribute('data-state', 'checked');

    await checkbox.click();
    await expect(checkbox).toHaveAttribute('data-state', 'unchecked');
  });

  test('numeric inputs sanitize invalid values', async () => {
    await compare.openFiltersDrawer();
    const minInput = compare.priceMinInput();
    await minInput.fill('');
    await minInput.blur();

    const minValue = Number(await minInput.inputValue());
    expect(Number.isNaN(minValue)).toBe(false);
  });
});
