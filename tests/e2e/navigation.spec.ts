import { expect, test } from '@playwright/test';
import { ComparePage } from './pages/compare.page';

test('homepage navigation to compare page works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Sparta Cells' })).toBeVisible();

  await page.getByRole('link', { name: 'Open Comparison' }).click();

  const compare = new ComparePage(page);
  await compare.waitForTableToRender();
  await expect(page.getByText('Sparta Cells — Compare')).toBeVisible();
});
