import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CSP guard: index.html ships exactly one inline script (theme bootstrap +
 * async font load) and its sha256 must match the hash pinned in vercel.json's
 * Content-Security-Policy. Editing that script without re-pinning the hash
 * would break the deployed app with a blank console error on every route.
 */
describe('index.html content security', () => {
  const html = readFileSync(join(__dirname, '..', 'index.html'), 'utf8');

  it('contains exactly one inline script whose hash matches vercel.json', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    expect(scripts).toHaveLength(1);

    const inlineHash = `'sha256-${createHash('sha256').update(scripts[0], 'utf8').digest('base64')}'`;

    const vercel = readFileSync(join(__dirname, '..', '..', '..', 'vercel.json'), 'utf8');
    expect(vercel).toContain('Content-Security-Policy');
    expect(vercel).toContain(inlineHash);
  });

  it('never uses inline event handlers (blocked by script-src without unsafe-hashes)', () => {
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  });
});
