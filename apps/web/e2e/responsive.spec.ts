import { expect, test, type Page } from '@playwright/test';

/**
 * Responsive hardening gates: no horizontal page scroll at any common width,
 * and the game dialog must stay scrollable/usable down to small phones.
 */
const ROUTES = ['/', '/u/nova', '/dashboard', '/onboarding'];
const WIDTHS = [320, 390, 768, 1024, 1440];

async function overflowPx(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

test.describe('responsive layout', () => {
  for (const width of WIDTHS) {
    test(`no horizontal overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForTimeout(900);
        const over = await overflowPx(page);
        expect(over, `${route} overflows by ${over}px at ${width}px`).toBeLessThanOrEqual(2);
      }
    });
  }

  test('game dialog stays usable at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 820 });
    await page.goto('/u/nova');
    await page.locator('#featured button').first().click();
    await page.getByRole('dialog').waitFor();
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toBeVisible();
    const scroller = page.locator('div.fixed.overflow-y-auto');
    await expect(scroller).toHaveCSS('overflow-y', 'auto');
  });

  test('chronicle filters stack and remain operable on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/u/nova');
    await page.getByLabel('Filter by status').selectOption('completed');
    await page.waitForTimeout(400);
    await expect(page.getByRole('heading', { name: /Every save tells a story/i })).toBeVisible();
  });
});
