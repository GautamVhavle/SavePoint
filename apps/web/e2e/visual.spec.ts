import { expect, test, type Page } from '@playwright/test';

/**
 * Visual regression guards. External imagery is stubbed with a flat tile so
 * only layout/typography/color can move the baseline, never remote photos.
 */
const TILE_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
}

async function settle(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function stubRemoteMedia(page: Page) {
  const tile = route => route.fulfill({ contentType: 'image/png', body: Buffer.from(TILE_PNG, 'base64') });
  await page.route(/images\.unsplash\.com/, tile);
  // IGDB key art must never leak live bytes into a baseline.
  await page.route(/images\.igdb\.com/, tile);
}

test.describe('visual baselines', () => {
  // Baselines are pixel-curated on macOS (fonts/AA differ across OSes).
  // Set PLAYWRIGHT_UPDATE_SNAPSHOTS=1 on a new platform to curate there.
  test.skip(
    process.platform !== 'darwin' && process.env.PLAYWRIGHT_UPDATE_SNAPSHOTS !== '1',
    'visual baselines are curated on macOS',
  );

  test('landing hero (dark)', async ({ page }) => {
    await prepare(page);
    await stubRemoteMedia(page);
    await page.goto('/');
    await settle(page);
    await expect(page.locator('main')).toHaveScreenshot('landing-dark.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('public archive full page (dark)', async ({ page }) => {
    await prepare(page);
    await stubRemoteMedia(page);
    await page.goto('/u/nova');
    await settle(page);
    // Reveal lazy sections before capturing the whole page.
    await page.evaluate(async () => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(700);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(400);
    await expect(page.locator('main')).toHaveScreenshot('archive-dark.png', {
      animations: 'disabled',
      fullPage: true,
      maxDiffPixelRatio: 0.02,
    });
  });

  test('public archive masthead (light)', async ({ page }) => {
    await prepare(page);
    await stubRemoteMedia(page);
    await page.addInitScript(() => localStorage.setItem('savepoint-theme', 'light'));
    await page.goto('/u/nova');
    await settle(page);
    await expect(page.getByRole('heading', { name: 'Nova Reyes' })).toHaveScreenshot(
      'archive-light-masthead.png',
      { animations: 'disabled', maxDiffPixelRatio: 0.02 },
    );
  });

  test('studio dashboard (dark)', async ({ page }) => {
    await prepare(page);
    await stubRemoteMedia(page);
    await page.goto('/dashboard');
    await settle(page);
    await expect(page.locator('main')).toHaveScreenshot('dashboard-dark.png', { animations: 'disabled', maxDiffPixelRatio: 0.02 });
  });

  test('archive on mobile (dark)', async ({ page }) => {
    await stubRemoteMedia(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/u/nova');
    await settle(page);
    await expect(page.locator('#featured')).toHaveScreenshot('archive-mobile-featured.png', {
      animations: 'disabled',
    });
  });
});
