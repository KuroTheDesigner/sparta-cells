import { expect, type Locator, type Page } from '@playwright/test';

export class ComparePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/compare', { waitUntil: 'networkidle' });
  }

  desktopSearch(): Locator {
    return this.page.getByRole('textbox', { name: 'Search phones' });
  }

  mobileSearch(): Locator {
    return this.page.locator('#mobile-search:visible');
  }

  clearButton(): Locator {
    return this.page.getByRole('button', { name: 'Clear', exact: true }).first();
  }

  async openFiltersDrawer() {
    const closeButton = this.page.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible().catch(() => false)) {
      return;
    }

    const mobileToggle = this.page.getByRole('button', { name: 'Open filters' }).first();
    if (await mobileToggle.isVisible().catch(() => false)) {
      await mobileToggle.click();
      await closeButton.waitFor({ state: 'visible' });
      return;
    }

    const showFilters = this.page.getByRole('button', { name: /show filters/i }).first();
    if (await showFilters.isVisible().catch(() => false)) {
      await showFilters.click();
      await this.page.getByRole('button', { name: /hide filters/i }).waitFor({ state: 'visible' });
    }
  }

  async closeFiltersDrawer() {
    const closeButton = this.page.getByRole('button', { name: 'Close' });
    if (await closeButton.isVisible().catch(() => false)) {
      const mobileDrawer = this.page.locator('aside.md\\:hidden');
      if (await mobileDrawer.isVisible().catch(() => false)) {
        await mobileDrawer.evaluate((node) => {
          node.scrollTo({ top: 0 });
        });
      }
      await closeButton.evaluate((element) => (element as HTMLElement).click());
      await expect(this.page.getByRole('button', { name: 'Open filters' }).first()).toBeVisible();
      return;
    }

    const hideFilters = this.page.getByRole('button', { name: /hide filters/i }).first();
    if (await hideFilters.isVisible().catch(() => false)) {
      await hideFilters.click();
      await this.page.getByRole('button', { name: /show filters/i }).waitFor({ state: 'visible' });
    }
  }

  async ensureSearchField(): Promise<Locator> {
    const desktop = this.desktopSearch();
    if (await desktop.isVisible().catch(() => false)) {
      return desktop;
    }

    await this.openFiltersDrawer();
    const mobile = this.mobileSearch().first();
    try {
      await mobile.waitFor({ state: 'visible', timeout: 2000 });
      return mobile;
    } catch {
      // fall through to error below
    }

    throw new Error('Expected a visible search field on the compare page.');
  }

  getTable(): Locator {
    return this.page.getByRole('table');
  }

  private scrollContainer(): Locator {
    return this.page.locator('[data-testid="specs-table-scroll"]');
  }

  private async getColumnCount(): Promise<number> {
    const container = this.scrollContainer();
    if ((await container.count()) === 0) {
      return 0;
    }
    const attribute = await container.getAttribute('data-columns');
    const parsed = attribute ? Number(attribute) : NaN;
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private async resetScrollPosition(): Promise<void> {
    const container = this.scrollContainer();
    if ((await container.count()) === 0) {
      return;
    }
    await container.evaluate((element) => {
      element.scrollTo({ left: 0 });
    });
  }

  private async collectIndexedTexts(cells: Locator): Promise<Map<number, string>> {
    const results = new Map<number, string>();
    const total = await this.getColumnCount();
    if (total === 0) {
      return results;
    }

    const container = this.scrollContainer();
    if ((await container.count()) === 0) {
      return results;
    }

    const captureCurrent = async () => {
      const captured = await cells.evaluateAll((nodes) =>
        nodes
          .map((node) => {
            const indexAttr = node.getAttribute('data-index');
            if (!indexAttr) return null;
            const index = Number(indexAttr);
            if (Number.isNaN(index)) return null;
            return {
              index,
              text: (node.textContent ?? '').trim(),
            };
          })
          .filter((entry): entry is { index: number; text: string } => entry !== null)
      );

      for (const { index, text } of captured) {
        if (results.has(index)) continue;
        results.set(index, normalizeTableText(text));
      }
    };

    if ((await cells.count()) === 0) {
      return results;
    }

    await this.resetScrollPosition();
    await this.page.waitForTimeout(20);
    await captureCurrent();
    if (results.size >= total) {
      return results;
    }

    const { scrollWidth, clientWidth } = await container.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));

    if (clientWidth === 0 || scrollWidth <= clientWidth) {
      return results;
    }

    const maxLeft = Math.max(scrollWidth - clientWidth, 0);
    const step = Math.max(Math.floor(clientWidth * 0.75), 1);
    let position = 0;
    let attempts = 0;
    let stagnantScrolls = 0;
    let previousSize = results.size;

    while (results.size < total && attempts <= total + 4 && position < maxLeft && stagnantScrolls < 2) {
      position = Math.min(maxLeft, position + step);
      try {
        await container.evaluate((element, left) => {
          element.scrollTo({ left });
        }, position);
      } catch {
        break;
      }
      await this.page.waitForTimeout(60);
      await captureCurrent();
      attempts += 1;
      if (results.size === previousSize) {
        stagnantScrolls += 1;
      } else {
        stagnantScrolls = 0;
        previousSize = results.size;
      }
    }

    await this.resetScrollPosition();
    return results;
  }

  getNoResultsNotice(): Locator {
    return this.page.getByText('No phones match the selected filters.', { exact: true });
  }

  private getCheckboxContainer(label: string): Locator {
    return this.page
      .locator('label', { hasText: label })
      .filter({ has: this.page.locator('[role="checkbox"]:visible') })
      .first();
  }

  getCheckbox(label: string): Locator {
    return this.getCheckboxContainer(label).locator('[role="checkbox"]:visible');
  }

  getToggleButton(): Locator {
    return this.page.getByRole('button', { name: /show filters|hide filters/i }).first();
  }

  getSidebarOpenButton(): Locator {
    return this.page.getByRole('button', { name: 'Open filters' }).first();
  }

  async setPriceRange(min: number, max: number) {
    await this.openFiltersDrawer();
    const minInput = this.priceMinInput();
    await minInput.scrollIntoViewIfNeeded();
    await minInput.fill(min.toString());
    const maxInput = this.priceMaxInput();
    await maxInput.scrollIntoViewIfNeeded();
    await maxInput.fill(max.toString());
  }

  priceMinInput(): Locator {
    return this.page.locator('input[aria-label="Minimum price"]:visible').first();
  }

  priceMaxInput(): Locator {
    return this.page.locator('input[aria-label="Maximum price"]:visible').first();
  }

  async clearFilters() {
    await this.openFiltersDrawer();
    const mobileDrawer = this.page.locator('aside.md\\:hidden');
    if (await mobileDrawer.isVisible().catch(() => false)) {
      await mobileDrawer.evaluate((node) => {
        node.scrollTo({ top: 0 });
      });
    }
    const clear = this.clearButton();
    await expect(clear).toBeVisible();
    await clear.evaluate((element) => (element as HTMLElement).click());
  }

  async getVisiblePhones(): Promise<string[]> {
    const headerCells = this.page.locator('table thead tr th[data-index]');
    const collected = await this.collectIndexedTexts(headerCells);
    return Array.from(collected.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  }

  private specRow(specLabel: string): Locator {
    return this.page
      .locator('table tbody tr')
      .filter({ has: this.page.locator('th', { hasText: specLabel }) })
      .first();
  }

  async getSpecRowTexts(specLabel: string): Promise<string[]> {
    const row = this.specRow(specLabel);
    if ((await row.count()) === 0) {
      return [];
    }
    await expect(row).toBeVisible();
    const collected = await this.collectIndexedTexts(row.locator('td[data-index]'));
    return Array.from(collected.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  }

  async getSpecRowRecord(specLabel: string): Promise<Record<string, string>> {
    const phones = await this.getVisiblePhones();
    const values = await this.getSpecRowTexts(specLabel);
    const entries: Record<string, string> = {};
    phones.forEach((phone, index) => {
      entries[phone] = values[index] ?? '';
    });
    return entries;
  }

  async getStatSummary(title: string): Promise<{ value: string; phone: string }> {
    const card = this.page
      .locator('article')
      .filter({ has: this.page.locator('h3', { hasText: new RegExp(`^${escapeRegExp(title)}$`, 'i') }) })
      .first();

    await expect(card).toBeVisible();
    const paragraphs = card.locator('p');
    return {
      value: (await paragraphs.nth(0).evaluate((node) => node.textContent?.trim() ?? '')),
      phone: (await paragraphs.nth(1).evaluate((node) => node.textContent?.trim() ?? '')),
    };
  }

  async getStatTitles(): Promise<string[]> {
    const headings = this.page.locator('article h3');
    const count = await headings.count();
    const titles: string[] = [];
    for (let index = 0; index < count; index += 1) {
      titles.push(await headings.nth(index).evaluate((node) => node.textContent?.trim() ?? ''));
    }
    return titles;
  }

  async waitForTableToRender() {
    const table = this.getTable();
    const empty = this.page.getByTestId('specs-empty-state');

    await Promise.race([
      table.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined),
      empty.waitFor({ state: 'visible', timeout: 10000 }).catch(() => undefined),
    ]);

    if (await table.count()) {
      return;
    }

    await expect(empty).toBeVisible();
  }

  async toggleFilter(optionLabel: string) {
    await this.openFiltersDrawer();
    const container = this.getCheckboxContainer(optionLabel);
    await container.scrollIntoViewIfNeeded();
    await container.evaluate((node) => {
      node.scrollIntoView({ block: 'center', inline: 'center' });
    });
    const checkbox = container.locator('[role="checkbox"]:visible');
    await checkbox.evaluate((element) => (element as HTMLElement).click());
  }

  async setCheckboxState(optionLabel: string, checked: boolean) {
    await this.openFiltersDrawer();
    const container = this.getCheckboxContainer(optionLabel);
    await container.scrollIntoViewIfNeeded();
    await container.evaluate((node) => {
      node.scrollIntoView({ block: 'center', inline: 'center' });
    });
    const checkbox = container.locator('[role="checkbox"]:visible');
    const isChecked = await checkbox.getAttribute('data-state');
    const currentlyChecked = isChecked === 'checked';
    if (currentlyChecked !== checked) {
      await checkbox.evaluate((element) => (element as HTMLElement).click());
    }
  }

  async reload() {
    await this.page.reload({ waitUntil: 'networkidle' });
  }

  async getVisibleColumnCount(): Promise<number> {
    return this.getColumnCount();
  }

  async getRenderedColumnCount(): Promise<number> {
    return this.page.locator('table thead tr th[data-index]').count();
  }

  async getVisibleStatSummaries(): Promise<Array<{ title: string; value: string; phone: string }>> {
    const cards = this.page.locator('article');
    const count = await cards.count();
    const summaries: Array<{ title: string; value: string; phone: string }> = [];
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      const title = await card.locator('h3').evaluate((node) => node.textContent?.trim() ?? '');
      const value = await card.locator('p').nth(0).evaluate((node) => node.textContent?.trim() ?? '');
      const phone = await card.locator('p').nth(1).evaluate((node) => node.textContent?.trim() ?? '');
      summaries.push({ title, value, phone });
    }
    return summaries;
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeTableText(value: string): string {
  return value
    .split('\n')
    .map((line) =>
      line
        .replace(/(\d)(MP)/gi, '$1 $2')
        .replace(/(\d)(mAh)/gi, '$1 $2')
        .replace(/(\d)(Hz)/gi, '$1 $2')
        .replace(/(\d)(W)(?![a-zA-Z])/gi, '$1 $2')
        .trim()
    )
    .join('\n')
    .trim();
}
