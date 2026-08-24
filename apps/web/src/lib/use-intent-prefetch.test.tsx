import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../pages/Onboarding', () => ({ default: {} }));
vi.mock('../pages/Dashboard', () => ({ default: {} }));
vi.mock('../pages/editors/GameEditor', () => ({ default: {} }));

import { hasPrefetched, prefetchRoute } from './use-intent-prefetch';

afterEach(() => vi.restoreAllMocks());

describe('prefetchRoute', () => {
  it('matches exact and nested studio routes', async () => {
    expect(prefetchRoute('/onboarding')).toBe(true);
    expect(hasPrefetched('/onboarding')).toBe(true);
    expect(prefetchRoute('/onboarding')).toBe(false); // deduped

    expect(prefetchRoute('/dashboard/games')).toBe(true);
  });

  it('reports false for unrelated paths without loading anything', () => {
    expect(prefetchRoute('/auth/callback')).toBe(false);
    expect(hasPrefetched('/auth/callback')).toBe(false);
  });
});
