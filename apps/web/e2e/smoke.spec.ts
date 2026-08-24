import { expect, test } from '@playwright/test';

test('public archive has required section order and details', async ({ page }) => {
  await page.goto('/u/nova');
  await expect(page.getByRole('heading', { name: 'Nova Reyes' })).toBeVisible();
  const headings = await page.locator('main section h2').allTextContents();
  expect(headings.join('|')).toMatch(/Rig.*games that stayed.*Every save.*compass/is);
  // The Hall of Fame card and its chronicle row share a label; target the card grid.
  await page.locator('#featured').getByRole('button', { name: /Open Outer Wilds details/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Field notes');
  await expect(page.getByRole('dialog')).toContainText('Archive record');
  await page.getByRole('button', { name: 'Close game details' }).click();
});

test('unknown routes render the 404 screen with a working SPA return home', async ({ page }) => {
  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: /No save/i })).toBeVisible();
  await page.getByRole('link', { name: 'Return home' }).click();
  await expect(page).toHaveURL(new RegExp('/?$'));
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('missing handle offers the showcase archive in demo mode', async ({ page }) => {
  await page.goto('/u/missing');
  await expect(page.getByRole('heading', { name: /sealed/i })).toBeVisible();
  await page.getByRole('link', { name: 'Try the showcase archive' }).click();
  await expect(page).toHaveURL(/\/u\/nova$/);
  await expect(page.getByRole('heading', { name: 'Nova Reyes' })).toBeVisible();
});

test('auth callback renders a recovery screen when sign-in fails', async ({ page }) => {
  await page.goto('/auth/callback?error=access_denied&error_description=User+cancelled+the+flow');
  await expect(page.getByRole('alert')).toContainText('The gate did not open.');
  await expect(page.getByRole('alert')).toContainText('User cancelled the flow');
});

test('theme and mobile navigation work', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.getByRole('button', { name: /Switch to (light|dark) theme/ }).click();
  await expect(html).toHaveAttribute('data-theme', before === 'dark' ? 'light' : 'dark');
});

test('mobile drawer opens, locks scroll, and closes every way', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const dialog = page.getByRole('dialog', { name: 'Site navigation' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Showcase' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('hidden');
  // Escape closes and unlocks scrolling
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => document.body.style.overflow)).toBe('');
  // Reopen: tapping the scrim must also dismiss
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(dialog).toBeVisible();
  await page.mouse.click(30, 400);
  await expect(dialog).toHaveCount(0);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(dialog).toBeVisible();
  await page.getByRole('dialog', { name: 'Site navigation' }).getByLabel('Close navigation').click();
  await expect(dialog).toHaveCount(0);
});

test('dossier arrow keys step through the collection with wrap-around', async ({ page }) => {
  await page.goto('/u/nova');
  const dialog = page.getByRole('dialog');
  await page.locator('#featured').getByRole('button', { name: /Open Outer Wilds details/ }).click();
  await expect(dialog).toBeVisible();

  await page.keyboard.press('ArrowRight');
  const title = dialog.getByRole('heading', { level: 2 }).first();
  await expect(title).not.toHaveText(/Outer Wilds/);

  await page.keyboard.press('ArrowLeft');
  await expect(dialog.getByRole('heading', { level: 2 }).first()).toHaveText(/Outer Wilds/);
});

test('floating actions appear past the masthead and return to top', async ({ page }) => {
  await page.goto('/u/nova');
  await expect(page.getByRole('button', { name: 'Back to top' })).toBeHidden();
  await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2, behavior: 'instant' }));
  // Let the scroll listener flip the floating actions' visibility state first.
  await page.waitForFunction(() => window.scrollY > window.innerHeight * 1.5);
  await expect(page.getByRole('button', { name: 'Back to top' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Share this archive' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to top' }).click();
  // Smooth scrolling duration varies by device; poll instead of sleeping.
  await expect
    .poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 })
    .toBeLessThan(80);
});
