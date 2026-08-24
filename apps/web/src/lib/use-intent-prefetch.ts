import { useEffect } from 'react';

const ROUTE_CHUNKS: Array<[prefix: string, load: () => Promise<unknown>]> = [
  ['/dashboard/games', () => import('../pages/editors/GameEditor')],
  ['/dashboard/rig', () => import('../pages/editors/RigEditor')],
  ['/dashboard/profile', () => import('../pages/editors/ProfileEditor')],
  ['/dashboard/awards', () => import('../pages/editors/AwardEditor')],
  ['/dashboard', () => Promise.all([import('../pages/Dashboard'), import('../pages/editors/FeaturedEditor')])],
  ['/onboarding', () => import('../pages/Onboarding')],
  ['/u/', () => import('../pages/PublicProfile')],
];

const prefetched = new Set<string>();

/**
 * Warms the lazy chunk(s) behind a route path. Returns true when a route
 * matched; repeats for the same prefix are no-ops for the session.
 */
export function prefetchRoute(path: string): boolean {
  if (prefetched.has(path)) return false;
  for (const [prefix, load] of ROUTE_CHUNKS) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      prefetched.add(path);
      prefetched.add(prefix);
      void load().catch(() => undefined);
      return true;
    }
  }
  return false;
}

/** True once a given path has already been warmed this session. */
export function hasPrefetched(path: string): boolean {
  return prefetched.has(path);
}

/**
 * Warms lazy route chunks on link hover/focus so navigation resolves from
 * cache. Touch taps that trigger it simply deduplicate against navigation.
 */
export function useIntentPrefetch(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onIntent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="/"]');
      if (!(anchor instanceof HTMLAnchorElement)) return;
      prefetchRoute(new URL(anchor.href).pathname);
    };
    document.addEventListener('pointerenter', onIntent, { capture: true });
    document.addEventListener('focusin', onIntent, { capture: true });
    return () => {
      document.removeEventListener('pointerenter', onIntent, { capture: true });
      document.removeEventListener('focusin', onIntent, { capture: true });
    };
  }, [enabled]);
}
