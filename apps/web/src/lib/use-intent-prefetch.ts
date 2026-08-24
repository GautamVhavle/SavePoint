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
 * Warms lazy route chunks on link hover/focus so navigation resolves from
 * cache. Fires at most once per target per session; touch taps that trigger
 * it simply deduplicate against the navigation itself.
 */
export function useIntentPrefetch(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onIntent = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest?.('a[href^="/"]');
      if (!(anchor instanceof HTMLAnchorElement) || prefetched.has(anchor.href)) return;
      const path = new URL(anchor.href).pathname;
      for (const [prefix, load] of ROUTE_CHUNKS) {
        if ((path === prefix || path.startsWith(`${prefix}/`)) && !prefetched.has(prefix)) {
          prefetched.add(anchor.href);
          prefetched.add(prefix);
          void load().catch(() => undefined);
          break;
        }
      }
    };
    document.addEventListener('pointerenter', onIntent, { capture: true });
    document.addEventListener('focusin', onIntent, { capture: true });
    return () => {
      document.removeEventListener('pointerenter', onIntent, { capture: true });
      document.removeEventListener('focusin', onIntent, { capture: true });
    };
  }, [enabled]);
}
