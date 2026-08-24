import { expect, test } from '@playwright/test';

/**
 * Full claim-your-archive journey against the demo backend: three steps,
 * unique handle, then landing in the studio with a personalized greeting.
 */
test('onboarding completes into the studio with the claimed identity', async ({ page }) => {
  await page.goto('/onboarding');
  const handle = `curator${Date.now().toString(36)}`;

  await page.getByPlaceholder('Nova Reyes').fill('Test Curator');
  await page.getByPlaceholder('nova', { exact: true }).fill(handle);
  await page.getByRole('button', { name: /Continue/ }).click();
  await page.getByRole('button', { name: /Continue/ }).click();
  await expect(page.getByText(/Your archive URL is ready/)).toBeVisible();
  await expect(page.getByText(new RegExp('/u/' + handle))).toBeVisible();

  await page.getByRole('button', { name: 'Reserve and enter studio' }).click();
  await expect(page.getByText(/Welcome back, Test\./)).toBeVisible({ timeout: 8000 });

  // The claimed handle must resolve as a public archive too.
  await page.goto(`/u/${handle}`);
  await expect(page.getByText('@' + handle)).toBeVisible();
});
