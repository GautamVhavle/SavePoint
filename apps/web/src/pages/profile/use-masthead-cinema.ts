import { useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { loadGsap } from './load-gsap';

/** Orchestrated masthead entrance: one cinematic moment, not scattered effects. */
export function useMastheadCinema(root: React.RefObject<HTMLDivElement | null>, statsRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!root.current) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    // The masthead copy starts at visibility:hidden so the reveal is clean.
    // If GSAP never gets to run its tween — module fetch failure, or a
    // background tab where requestAnimationFrame never ticks — that copy
    // would stay invisible forever, so a failsafe always uncovers it.
    const reveal = () => root.current?.querySelectorAll<HTMLElement>('[data-cinema]')
      .forEach((el) => { el.style.visibility = 'visible'; el.style.opacity = '1'; });
    const failsafe = window.setTimeout(reveal, 2600);
    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled || !root.current) return;
      ctx = gsap.context((self) => {
        const q = self.selector!;
        if (reduce || document.hidden) {
          gsap.set(q('[data-cinema]'), { autoAlpha: 1, y: 0 });
          if (reduce) return;
        } else {
          gsap.fromTo(q('[data-banner-zoom]'), { scale: 1.14 }, { scale: 1, duration: 1.6, ease: 'power2.out' });
          gsap.fromTo(q('[data-cinema]'),
            { autoAlpha: 0, y: 34 },
            { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.11, delay: 0.15 });
        }
        gsap.registerPlugin(ScrollTrigger);
        gsap.to(q('[data-banner-parallax]'), {
          yPercent: 14, ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        });
        const counters = statsRef.current?.querySelectorAll<HTMLElement>('[data-count]');
        counters?.forEach((el) => {
          const target = Number(el.dataset.count ?? 0);
          if (document.hidden) { el.textContent = target.toLocaleString('en-US'); return; }
          gsap.fromTo(el, { innerText: 0 }, {
            innerText: target, duration: 1.4, delay: 0.5, ease: 'power1.out', snap: { innerText: 1 },
            onUpdate() { el.textContent = Math.round(Number(el.innerText)).toLocaleString('en-US'); },
          });
        });
      }, root);
    });
    return () => { cancelled = true; window.clearTimeout(failsafe); ctx?.revert(); };
  }, [reduce, root, statsRef, ready]);
}
