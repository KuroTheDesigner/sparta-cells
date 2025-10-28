import { test, expect } from '@playwright/test';
import type { TestInfo } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

type Scenario = {
  id: string;
  path: string;
  viewport: { width: number; height: number };
};

const SCENARIOS: Scenario[] = [
  { id: 'home-desktop', path: '/', viewport: { width: 1440, height: 900 } },
  { id: 'compare-desktop', path: '/compare', viewport: { width: 1440, height: 900 } },
  { id: 'compare-tablet', path: '/compare', viewport: { width: 1024, height: 768 } },
  { id: 'compare-mobile', path: '/compare', viewport: { width: 390, height: 844 } },
];

async function attachPng(name: string, buffer: Buffer, testInfo: TestInfo) {
  await testInfo.attach(name, { body: buffer, contentType: 'image/png' });
}

test.describe('UI audit snapshots', () => {
  for (const scenario of SCENARIOS) {
    test(`capture ${scenario.id}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== 'chromium', 'UI audit snapshots run only on desktop');
      await page.setViewportSize(scenario.viewport);
      await page.goto(scenario.path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);

      const full = await page.screenshot({ fullPage: true });
      await attachPng(`${scenario.id}-full`, full, testInfo);

      const header = page.getByTestId('app-header');
      if (await header.count()) {
        await attachPng(
          `${scenario.id}-header`,
          await header.screenshot(),
          testInfo
        );
      }

      if (scenario.path === '/compare') {
        const statCards = page.getByTestId('stat-cards-grid');
        if (await statCards.count()) {
          await attachPng(
            `${scenario.id}-stat-cards`,
            await statCards.screenshot(),
            testInfo
          );
        }

        const filtersPanel = page.locator('[data-testid="filters-panel"]:visible');
        if (await filtersPanel.count()) {
          await attachPng(
            `${scenario.id}-filters`,
            await filtersPanel.first().screenshot(),
            testInfo
          );
        }

        const scroller = page.getByTestId('specs-table-scroll');
        if (await scroller.count()) {
          const element = scroller.first();
          const measures = await element.evaluate((node) => ({
            maxScroll: node.scrollWidth - node.clientWidth,
          }));

          await element.evaluate((node) => node.scrollTo({ left: 0, behavior: 'auto' }));
          await attachPng(`${scenario.id}-table-start`, await element.screenshot(), testInfo);

          if (measures.maxScroll > 0) {
            await element.evaluate((node) => node.scrollTo({ left: node.scrollWidth / 2, behavior: 'auto' }));
            await attachPng(`${scenario.id}-table-mid`, await element.screenshot(), testInfo);

            await element.evaluate((node) => node.scrollTo({ left: node.scrollWidth, behavior: 'auto' }));
            await attachPng(`${scenario.id}-table-end`, await element.screenshot(), testInfo);
          }

          await element.focus();
          await page.keyboard.press('Tab');
          const focused = page.locator(':focus-visible');
          if (await focused.count()) {
            await attachPng(`${scenario.id}-focus-state`, await focused.first().screenshot(), testInfo);
          }
        }
      }

      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      await testInfo.attach(`${scenario.id}-axe`, {
        body: Buffer.from(JSON.stringify(axe, null, 2)),
        contentType: 'application/json',
      });
      const critical = axe.violations.filter((violation) => violation.impact === 'critical');
      expect(critical, 'No critical accessibility violations').toEqual([]);
    });
  }
});
