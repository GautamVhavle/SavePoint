import { useEffect, useState } from 'react';

/** Counts a number up on mount; instant under reduced motion. */
export function useCountUp(target: number, duration = 700): number {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const [value, setValue] = useState(reduce ? target : 0);
  useEffect(() => {
    if (reduce) { setValue(target); return; }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      setValue(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration, reduce]);
  return value;
}
