import { memo, useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { clsx as cn } from 'clsx';
import { ArrowUpRight, Medal, Star } from 'lucide-react';
import type { Game } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import { CoverImage } from '../../components/ui';
import { Stars } from './Stars';

export const MotionSection = ({ children, className = '', id, watermark }: { children: React.ReactNode; className?: string; id?: string; watermark?: string }) => { const reduce = useReducedMotion(); return <motion.section id={id} className={cn('relative', className)} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .55 }}>{watermark && <span aria-hidden className="watermark">{watermark}</span>}{children}</motion.section>; };

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [.22, .61, .36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export const GameCard = memo(function GameCard({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      layout
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className={`card-sheen group relative aspect-[3/4] overflow-hidden rounded-[20px] border text-left shadow-card transition-colors sm:aspect-[4/4.6] sm:min-h-64 sm:rounded-[24px] ${game.featured ? 'holo-ring border-transparent' : 'border-white/15'}`}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      {/* Mobile: box art alone (display:none keeps it unfetched on desktop).
          Desktop: wide banner art under the full stat overlay. */}
      <CoverImage src={game.cover} alt={`${game.title} cover artwork`} className="absolute inset-0 transition duration-700 group-hover:scale-[1.05] sm:hidden" />
      <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 hidden sm:block" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070f]/85 via-transparent to-black/10 sm:from-[#05070f] sm:via-[#05070f]/30" />
      <motion.div aria-hidden style={{ backgroundImage: `linear-gradient(150deg, ${tone.soft}, transparent 46%)` }} className="absolute inset-0 opacity-80" />

      {/* Status spine reads at every size without stealing attention. */}
      <motion.span aria-hidden initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:.5,ease:"easeOut"}} className="absolute inset-y-0 left-0 w-[3px] origin-top" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 72%)` }} />
      {game.award && (
        <span className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full border border-amber-200/40 bg-black/55 text-amber-200 shadow-glow-amber sm:right-3 sm:top-3" title={game.award}>
          <Medal size={16} />
        </span>
      )}

      {game.featured && (
        <span className="absolute right-3 top-14 hidden font-mono text-[9px] uppercase tracking-[.28em] text-cyan-200/90 [writing-mode:vertical-rl] sm:block">
          Hall of fame
        </span>
      )}

      {/* Desktop-only overlay: title, stars, platform. */}
      <div className="absolute inset-x-0 bottom-0 hidden p-4 text-white sm:block">
        <span className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[.22em]" style={{ color: tone.core }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.core, boxShadow: `0 0 8px ${tone.core}` }} />
          {STATUS_LABELS[game.status]} · {game.year}
        </span>
        <h3 className="mt-1.5 line-clamp-2 text-xl font-semibold leading-tight">{game.title}</h3>
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <Stars value={game.rating} />
          <span className="rounded-full border border-white/15 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-white/80">{game.platform}</span>
        </div>
      </div>

      {/* Compact value chip survives on mobile art so worth is visible pre-tap. */}
      {game.rating != null && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-200 backdrop-blur-sm sm:hidden">
          <Star size={10} fill="currentColor" />{game.rating.toFixed(1)}
        </span>
      )}
    </motion.button>
  );
});

export function TickerStrip({ games }: { games: Game[] }) {
  if (!games.length) return null;
  const items = games.map(g => g.rating == null
    ? g.title
    : `${g.title} ${'\u2605'.repeat(Math.max(1, Math.round(g.rating)))}`);
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 py-3 font-mono text-[11px] uppercase tracking-[.24em] text-white/70">
          {t}<span className="text-white/45">{'\u25c6'}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker relative z-10" role="presentation">
      <div className="sr-only">Featured games: {items.join(', ')}</div>
      <div className="ticker-track">{row(true)}{row(true)}</div>
    </div>
  );
}

/** Desktop-only: the first inductee gets the pedestal. */
export const GrandExhibit = memo(function GrandExhibit({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className="holo-ring group relative block w-full overflow-hidden rounded-[28px] text-left shadow-card"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <div className="relative min-h-[380px] lg:min-h-[460px]">
        <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 transition duration-[1200ms] group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04060d]/80 via-transparent to-transparent" />
        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 75%)` }} />
        {game.award && (
          <span className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-amber-200/40 bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.2em] text-amber-200 backdrop-blur-sm">
            <Medal size={14} /> {game.award}
          </span>
        )}
        <span className="absolute left-7 top-7 hidden font-mono text-[10px] uppercase tracking-[.34em] text-white/70 [writing-mode:vertical-rl] lg:block">
          Grand exhibit · Nº 001
        </span>
        <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.26em]" style={{ color: tone.core }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.core, boxShadow: `0 0 10px ${tone.core}` }} />
            {STATUS_LABELS[game.status]} · Est. {game.year} · {game.hours} hrs logged
          </span>
          <h3 className="mt-3 max-w-4xl text-[clamp(2.2rem,5vw,4.5rem)] font-bold leading-[.92] tracking-[-.05em] text-white">{game.title}</h3>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Stars value={game.rating} />
            <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[11px] text-white/85">{game.platform}</span>
            {game.featuredNote && <p className="hidden max-w-md text-sm italic leading-6 text-white/70 lg:block">“{game.featuredNote}”</p>}
            <span className="ml-auto hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-cyan-200 opacity-0 transition duration-300 group-hover:opacity-100 sm:flex">
              Open the dossier <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
});

/** Desktop-only plaque: art above, engraved nameplate below. */
export const HallPlaque = memo(function HallPlaque({ game, index, onOpen }: { game: Game; index: number; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className="card-sheen group relative overflow-hidden rounded-[24px] border border-white/10 bg-panel text-left shadow-card transition-colors hover:border-cyan-300/30"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 transition duration-700 group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <motion.span aria-hidden initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:.5,ease:"easeOut"}} className="absolute inset-y-0 left-0 w-[3px] origin-top" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 70%)` }} />
        {game.award && (
          <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-amber-200/40 bg-black/55 text-amber-200" title={game.award}>
            <Medal size={14} />
          </span>
        )}
        <span className="absolute bottom-3 left-4 font-mono text-[9px] uppercase tracking-[.26em]" style={{ color: tone.core }}>
          Induction Nº {String(index + 1).padStart(3, '0')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3.5 backdrop-blur-sm">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{game.title}</h3>
          <p className="muted mt-0.5 font-mono text-[10px] uppercase tracking-wider">{STATUS_LABELS[game.status]} · {game.year}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Stars value={game.rating} />
          <span className="rounded-full border border-white/12 bg-black/35 px-2 py-0.5 font-mono text-[10px] text-white/75">{game.platform}</span>
        </div>
      </div>
    </motion.button>
  );
});

export function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 }); const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(e) => { if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - .5) * 7);
        rx.set(-((e.clientY - r.top) / r.height - .5) * 7); }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}
    >{children}</motion.div>
  );
}
