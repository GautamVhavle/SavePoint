let gsapModules: Promise<{ gsap: typeof import('gsap')['default']; ScrollTrigger: typeof import('gsap/ScrollTrigger')['ScrollTrigger'] }> | null = null;
/** GSAP powers one cinematic moment per profile; fetch it only when that page mounts. */
export function loadGsap() {
  return gsapModules ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')])
    .then(([gsap, scrollTrigger]) => ({ gsap: gsap.default, ScrollTrigger: scrollTrigger.ScrollTrigger }));
}
