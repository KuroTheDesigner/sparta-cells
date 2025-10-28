import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare filter persistence', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('filter selections persist after reload', async () => {
    const search = await compare.ensureSearchField();
    await search.fill('pixel');

    await compare.setPriceRange(250000, 350000);
    await compare.setCheckboxState('Snapdragon 8 Gen 2', true);
    await compare.setCheckboxState('Yes', true);
    await compare.closeFiltersDrawer();

    const namesBefore = await compare.getVisiblePhones();
    await compare.reload();
    await compare.waitForTableToRender();

    const restoredSearch = await compare.ensureSearchField();
    expect(await restoredSearch.inputValue()).toBe('pixel');

    await compare.openFiltersDrawer();
    expect(await compare.priceMinInput().inputValue()).toBe('250000');
    expect(await compare.priceMaxInput().inputValue()).toBe('350000');

    await expect(compare.getCheckbox('Snapdragon 8 Gen 2')).toHaveAttribute('data-state', 'checked');
    await expect(compare.getCheckbox('Yes')).toHaveAttribute('data-state', 'checked');
    await compare.closeFiltersDrawer();

    const namesAfter = await compare.getVisiblePhones();
    expect(namesAfter).toEqual(namesBefore);
  });
});
