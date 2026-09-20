import { expect, test, type Page } from '@playwright/test';

/**
 * Studio editor flow exercised against the in-browser demo backend
 * (same SavepointClient contract as the live API integration).
 */
async function openStudioGames(page: Page) {
  await page.goto('/dashboard/games');
  await page.getByLabel('SEARCH IGDB').waitFor();
}

test('curator can search IGDB and add a game to the chronicle', async ({ page }) => {
  await openStudioGames(page);
  const before = await page
    .getByRole('heading', { name: /Your library \(\d+\)/ })
    .textContent();

  await page.getByLabel('SEARCH IGDB').fill('disco elysium');
  // Scope to results so library rows can never win the search-debounce race.
  const result = page.getByRole('group', { name: 'IGDB search results' }).getByRole('button', { name: /Disco Elysium/ }).first();
  await result.click();

  await page.getByLabel('RATING').selectOption('4.5');
  await page.getByLabel('PLATFORM PLAYED').fill('Steam Deck');
  await page.getByLabel('REVIEW').fill('Repetition turned into intimacy; every return home lands differently.');
  await page.getByRole('button', { name: 'Add to chronicle' }).click();

  await expect(page.getByRole('heading', { name: /Your library \(\d+\)/ })).not.toHaveText(before ?? '');
  const row = page.locator('li', { has: page.getByRole('button', { name: 'Edit Disco Elysium' }) });
  await expect(row).toBeVisible();
  await expect(row).toContainText('4.5★');
});

test('identity editor can add a public link that appears on the archive', async ({ page }) => {
  await page.goto('/dashboard/profile');
  await page.getByRole('button', { name: 'Website' }).click();
  await page.getByLabel('Link 6 URL').fill('https://savepointarchive.vercel.app');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.locator('.toast')).toContainText(/Identity archived/i);
  await page.goto('/u/nova');
  await expect(page.getByRole('heading', { name: /rest of the map/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /Website/ }).first()).toHaveAttribute('href', 'https://savepointarchive.vercel.app');
});

test('identity editor can unpublish and restore the public archive', async ({ page }) => {
  await page.goto('/dashboard/profile');
  const toggle = page.getByRole('switch', { name: /Unpublish archive|Publish archive/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await toggle.click();
  await expect(page.locator('.toast')).toContainText(/unpublished/i);
  await page.goto('/u/nova');
  await expect(page.getByRole('heading', { name: /sealed/i })).toBeVisible();
  await page.goto('/dashboard/profile');
  await page.getByRole('switch', { name: 'Publish archive' }).click();
  await expect(page.locator('.toast')).toContainText(/public again/i);
});

test('duplicate IGDB additions are rejected with a visible reason', async ({ page }) => {
  await openStudioGames(page);
  // Hades ships inside the seeded demo archive, so re-adding must fail loudly.
  // Scope to the results group so library "Edit Hades" rows can never win the
  // race against the 300ms search debounce.
  await page.getByLabel('SEARCH IGDB').fill('hades');
  await page.getByRole('group', { name: 'IGDB search results' }).getByRole('button', { name: /Hades/ }).first().click();
  await page.getByRole('button', { name: 'Add to chronicle' }).click();
  await expect(page.locator('.toast')).toContainText(/already exists/i);
});
