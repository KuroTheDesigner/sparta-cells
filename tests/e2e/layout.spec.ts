import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare layout interactions', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('desktop filter toggle hides and shows sidebar', async ({ isMobile }) => {
    test.skip(isMobile, 'Desktop layout only');

    const toggle = compare.getToggleButton();
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText(/hide filters/i);

    await toggle.click();
    await expect(toggle).toHaveText(/show filters/i);

    await toggle.click();
    await expect(toggle).toHaveText(/hide filters/i);
    await compare.waitForTableToRender();
  });

  test('mobile drawer allows filtering', async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile drawer is only relevant on mobile projects');

    await compare.openFiltersDrawer();
    await compare.toggleFilter('Snapdragon 8 Gen 1');
    await compare.closeFiltersDrawer();

    await expect(compare.getTable()).toBeVisible();
    const cpuValues = await compare.getSpecRowTexts('CPU Model');
    cpuValues.forEach((value) => expect(value).toContain('Snapdragon 8 Gen 1'));
  });
});
