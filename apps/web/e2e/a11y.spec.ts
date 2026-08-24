import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function scan(page: Page, path: string, theme: 'dark' | 'light') {
  await page.addInitScript(themeValue => localStorage.setItem('savepoint-theme', themeValue), theme);
  await page.goto(path);
  // Allow entrance animations to settle so elements are visible for axe.
  await page.waitForTimeout(900);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  return results.violations.filter(violation => ['serious', 'critical'].includes(violation.impact ?? ''));
}

test('public archive passes serious/critical wcag checks in both themes', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    const violations = await scan(page, '/u/nova', theme);
    expect(
      violations.map(v => `${theme}: ${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  }
});

test('landing page passes serious/critical wcag checks in light theme', async ({ page }) => {
  const violations = await scan(page, '/', 'light');
  expect(
    violations.map(v => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});

test('curator studio passes serious/critical wcag checks in both themes', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    const violations = await scan(page, '/dashboard', theme);
    expect(
      violations.map(v => `${theme}: ${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  }
});
