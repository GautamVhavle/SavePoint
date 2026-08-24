import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

/**
 * Enforces the deployed Content-Security-Policy locally: the exact header
 * vercel.json ships is injected onto every response, and any violation on
 * the key routes fails the suite. Keeps the policy from rotting as the app
 * gains new origins or inline code.
 */
const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');
const vercel = JSON.parse(readFileSync(join(repoRoot, 'vercel.json'), 'utf8'));
const csp = vercel.headers
  .flatMap((rule: { headers: Array<{ key: string; value: string }> }) => rule.headers)
  .find((header: { key: string }) => header.key === 'Content-Security-Policy')
  .value as string;

for (const path of ['/', '/u/nova', '/onboarding', '/dashboard']) {
  test(`no CSP violations on ${path}`, async ({ page }) => {
    test.setTimeout(20_000);
    const violations: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('Content-Security-Policy')) violations.push(msg.text());
    });
    await page.route('**/*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
    });
    await page.goto(path);
    await page.waitForTimeout(1500);
    expect(violations, violations.join('\n')).toEqual([]);
  });
}
