import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test.describe('Specs table virtualization', () => {
  let compare: ComparePage;

  test.beforeEach(async ({ page }) => {
    compare = new ComparePage(page);
    await compare.goto();
    await compare.waitForTableToRender();
  });

  test('renders only a subset of columns at once while exposing all data', async () => {
    const totalColumns = await compare.getVisibleColumnCount();
    expect(totalColumns).toBeGreaterThan(6);

    const renderedColumns = await compare.getRenderedColumnCount();
    expect(renderedColumns).toBeLessThan(totalColumns);

    const phones = await compare.getVisiblePhones();
    expect(phones).toHaveLength(totalColumns);
  });

  test('disables virtualization for small result sets', async () => {
    const search = await compare.ensureSearchField();
    await search.fill('Pixel 8');
    await compare.waitForTableToRender();

    const filteredColumns = await compare.getVisibleColumnCount();
    expect(filteredColumns).toBeLessThanOrEqual(3);

    const renderedColumns = await compare.getRenderedColumnCount();
    expect(renderedColumns).toBe(filteredColumns);
  });
});
