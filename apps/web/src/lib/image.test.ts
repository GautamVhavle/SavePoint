import { describe, expect, it } from 'vitest';
import { igdbWideMobileVariant } from './image';

describe('igdbWideMobileVariant', () => {
  it('downgrades IGDB 1080p banners to the 720p variant', () => {
    expect(igdbWideMobileVariant('https://images.igdb.com/igdb/image/upload/t_1080p/abc123.jpg'))
      .toBe('https://images.igdb.com/igdb/image/upload/t_720p/abc123.jpg');
  });

  it('leaves covers and non-IGDB hosts untouched', () => {
    const cover = 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg';
    const blob = 'https://abc123.public.blob.vercel-storage.com/users/u1/rig/x.webp';
    expect(igdbWideMobileVariant(cover)).toBe(cover);
    expect(igdbWideMobileVariant(blob)).toBe(blob);
  });
});
