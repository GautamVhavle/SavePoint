import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyToClipboard } from './clipboard';

afterEach(() => vi.unstubAllGlobals());

describe('copyToClipboard', () => {
  it('returns true when the write succeeds', async () => {
    const write = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: write } });
    await expect(copyToClipboard('hello')).resolves.toBe(true);
    expect(write).toHaveBeenCalledWith('hello');
  });

  it('returns false instead of throwing when the clipboard is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    await expect(copyToClipboard('hello')).resolves.toBe(false);
  });
});
