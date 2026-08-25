import { Star } from 'lucide-react';

/**
 * Renders the rating with true fractional fill: a 4.5 shows four solid stars
 * and one half-lit star rather than rounding up to five, which used to
 * overstate every half-step score.
 */
export function Stars({ value, size = 12 }: { value: number | null; size?: number }) {
  if (value == null) return <span className="text-xs uppercase tracking-[.16em] text-ink/50">Unrated</span>;
  return (
    <span className="inline-flex items-center gap-[3px]" role="img" aria-label={`Rated ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map(step => {
        const fill = Math.min(1, Math.max(0, value - (step - 1)));
        return (
          <span key={step} className="relative inline-flex" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-ink/25" fill="none" strokeWidth={1.75} aria-hidden />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 left-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
                aria-hidden
              >
                <Star size={size} className="text-amber-300" fill="currentColor" strokeWidth={1.75} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
