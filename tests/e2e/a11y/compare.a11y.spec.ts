import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { ComparePage } from '../pages/compare.page';

test.describe('Accessibility - Compare page', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('has no accessibility violations on desktop layout', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop coverage only for this check');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('has no accessibility violations on mobile layout', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Mobile coverage only for this check');

    await compare.openFiltersDrawer();
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('key regions are accessible', async ({ page }) => {
    const regions = ['header', 'aside:first-of-type', 'table'];

    for (const region of regions) {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include(region)
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });
});
