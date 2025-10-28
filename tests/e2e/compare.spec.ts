import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Compare page baseline flows', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('search narrows results', async ({ isMobile }) => {
    test.skip(isMobile, 'Covered in dedicated mobile flows');

    const search = await compare.ensureSearchField();
    await search.fill('pixel');
    await expect(compare.getTable()).toContainText(/pixel/i);
  });

  test('toggling a CPU filter limits visible phones', async ({ isMobile }) => {
    test.skip(isMobile, 'Desktop-specific validation');

    const initialCount = await compare.getVisibleColumnCount();
    await compare.toggleFilter('Snapdragon 8 Gen 1');
    const filteredCount = await compare.getVisibleColumnCount();
    expect(filteredCount).toBeLessThan(initialCount);

    const cpuValues = await compare.getSpecRowTexts('CPU Model');
    cpuValues.forEach((value) => expect(value).toContain('Snapdragon 8 Gen 1'));
  });

  test('mobile drawer interaction retains results', async ({ isMobile }) => {
    test.skip(!isMobile, 'Mobile-only scenario');

    await compare.openFiltersDrawer();
    await compare.toggleFilter('Snapdragon 8 Gen 1');
    await compare.closeFiltersDrawer();
    await expect(compare.getTable()).toBeVisible();
  });
});


