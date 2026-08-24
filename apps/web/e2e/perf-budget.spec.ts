import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { expect, test } from '@playwright/test';

/**
 * Performance budget guard: the eagerly-loaded JS for any route must stay
 * under the documented ceiling (~150 KB gzip; see docs/architecture.md).
 * GSAP, Auth0, schemas/zod, and route code are all deferred by design and
 * excluded here — merging them back in should fail this test loudly.
 */
const here = dirname(fileURLToPath(import.meta.url));
const distAssets = join(here, '..', 'dist', 'assets');
const BUDGET_BYTES = 160 * 1024;

const EAGER_PREFIXES = ['framework-', 'motion-', 'query-'];

function eagerEntryChunks(): string[] {
  return readdirSync(distAssets).filter(f => f.startsWith('index-') && f.endsWith('.js'));
}

test('eager JavaScript stays within the gzip budget', () => {
  const files = [...EAGER_PREFIXES.map(p =>
    readdirSync(distAssets).find(f => f.startsWith(p) && f.endsWith('.js')),
  ), ...eagerEntryChunks()].filter((f): f is string => Boolean(f));

  expect(files.length).toBeGreaterThanOrEqual(4);
  let totalGzip = 0;
  for (const f of files) {
    totalGzip += gzipSync(readFileSync(join(distAssets, f))).length;
  }
  expect(totalGzip, `${files.join(', ')} = ${(totalGzip / 1024).toFixed(1)} KB gzip`).toBeLessThanOrEqual(BUDGET_BYTES);
});
