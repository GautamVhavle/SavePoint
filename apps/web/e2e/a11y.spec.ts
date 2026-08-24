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

test('onboarding passes serious/critical wcag checks in both themes', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    const violations = await scan(page, '/onboarding', theme);
    expect(
      violations.map(v => `${theme}: ${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  }
});

test('curator studio passes serious/critical wcag checks in both themes', async ({ page }) => {
  for (const theme of ['dark', 'light'] as const) {
    const violations = await scan(page, '/dashboard', theme);
    expect(
      violations.map(v => `${theme}: ${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
    ).toEqual([]);
  }
});

test('open game dossier passes serious/critical wcag checks', async ({ page }) => {
  await page.goto('/u/nova');
  await page.locator('#featured').getByRole('button', { name: /Open Outer Wilds details/ }).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForTimeout(900);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});

test('mobile navigation drawer passes serious/critical wcag checks while open', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/u/nova');
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.getByRole('dialog', { name: 'Site navigation' }).waitFor();
  await page.waitForTimeout(500);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});

test('studio games editor passes serious/critical wcag checks', async ({ page }) => {
  await page.goto('/dashboard/games');
  await page.getByLabel('SEARCH IGDB').waitFor();
  // Exercise the search results group before scanning.
  await page.getByLabel('SEARCH IGDB').fill('hades');
  await page.getByRole('group', { name: 'IGDB search results' }).getByRole('button').first().waitFor();
  await page.waitForTimeout(600);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});

test('onboarding finish step passes serious/critical wcag checks', async ({ page }) => {
  await page.goto('/onboarding');
  await page.getByPlaceholder('Nova Reyes').fill('Scan Curator');
  await page.getByPlaceholder('nova', { exact: true }).fill('curatorscan');
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Your archive URL is ready/)).toBeVisible();
  await page.waitForTimeout(400);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(
    results.violations.filter(v => ['serious', 'critical'].includes(v.impact ?? '')).map(v => `${v.id} (${v.impact}) → ${v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | ')}`),
  ).toEqual([]);
});
