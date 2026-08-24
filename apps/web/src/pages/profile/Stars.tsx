import { memo } from 'react';
import { Star } from 'lucide-react';

export const Stars = memo(function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">Unrated</span>;
  const filled = Math.round(value);
  return <span className="flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>{[1,2,3,4,5].map(n => (
    <Star key={n} size={12} aria-hidden className={n <= filled ? 'text-amber-300' : 'text-white/25'} fill={n <= filled ? 'currentColor' : 'none'} />
  ))}</span>;
});
