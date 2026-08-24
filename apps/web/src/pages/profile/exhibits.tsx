import { memo, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { clsx as cn } from 'clsx';
import { ArrowUpRight, Medal, Star } from 'lucide-react';
import type { Game } from '../../types';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import { CoverImage } from '../../components/ui';
import { Stars } from './Stars';

gsap.registerPlugin(ScrollTrigger);

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
  const items = useMemo(() => games.map(g => g.rating == null
    ? g.title
    : `${g.title} ${'\u2605'.repeat(Math.max(1, Math.round(g.rating)))}`), [games]);
  if (!games.length) return null;
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

/**
 * GalleryWall: the Hall of Fame as a scroll-scrubbed exhibition rail.
 * lg+ pins the stage and translates the track horizontally as you scroll;
 * smaller screens get a native snap carousel of the same posters.
 */
export function GalleryWall({ games, onOpen }: { games: Game[]; onOpen: (game: Game) => void }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (!stageRef.current || !trackRef.current || reduce) return;
    if (!window.matchMedia('(min-width:1024px)').matches) return;
    setPinned(true);
    const stage = stageRef.current as HTMLElement;
    const track = trackRef.current as HTMLElement;
    if (!stage || !track) return;
    const ctx = gsap.context(() => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + window.innerWidth * 0.12);
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: stage, start: 'top top', end: () => '+=' + distance(),
          scrub: 0.6, pin: stage, anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self2) => { if (barRef.current) barRef.current.style.transform = `scaleX(${self2.progress})`; },
        },
      });
    }, stageRef);
    return () => { ctx.revert(); setPinned(false); };
  }, [reduce]);

  if (!games.length) return null;
  return (
    <div ref={stageRef} data-wall-stage className={cn('relative', 'hidden sm:block', pinned ? 'lg:h-screen' : '')}>
      <div
        ref={trackRef} data-wall-track
        className={cn(
          'flex items-center gap-[4vw] px-[7vw]',
          pinned ? 'lg:h-screen lg:flex-nowrap lg:overflow-visible' : 'snap-x snap-mandatory overflow-x-auto pb-8',
        )}
      >
        <IntroPanel count={games.length} />
        {games.map((game, i) => (
          <GalleryPoster key={game.id} game={game} index={i + 1} grand={i === 0} onOpen={() => onOpen(game)} />
        ))}
      </div>
      <span aria-hidden className="absolute inset-x-[7vw] bottom-10 hidden h-px bg-white/10 lg:block">
        <span ref={barRef} className="block h-full origin-left scale-x-0 bg-cyan-300/80" style={{ transform: 'scaleX(0)' }} />
      </span>
    </div>
  );
}

function PosterShell({ game, index, grand, onOpen, children, className }: {
  game: Game; index: number; grand: boolean; onOpen: () => void; children: React.ReactNode; className?: string;
}) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={onOpen}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      whileTap={{ scale: 0.985 }}
      className={cn(
        'group relative shrink-0 snap-center overflow-hidden rounded-[26px] text-left shadow-card ring-1 ring-white/10',
        'transition-shadow duration-500 hover:shadow-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
        grand ? 'w-[80vw] sm:w-[62vw] lg:w-[46vw]' : 'w-[70vw] sm:w-[44vw] lg:w-[30vw]',
        'h-[64vh] sm:h-[68vh] lg:h-[74vh]',
        className,
      )}
    >
      {children}
      <span aria-hidden className="pointer-events-none absolute -left-2 -top-7 select-none text-[clamp(5rem,9vw,9rem)] font-bold leading-none tracking-tighter text-transparent opacity-90 [-webkit-text-stroke:1.5px_rgba(255,255,255,.28)]">
        {String(index).padStart(2, '0')}
      </span>
      {game.award && (
        <span className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full border border-amber-200/40 bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-amber-200 backdrop-blur-sm">
          <Medal size={13} /> {game.award}
        </span>
      )}
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${tone.core}, transparent 60%)` }} />
      {/* meta */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 pt-16 sm:p-7">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.24em]" style={{ color: tone.core }}>
          <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.core, boxShadow: `0 0 10px ${tone.core}` }} />
          Nº {String(index).padStart(3, '0')} · {STATUS_LABELS[game.status]} · Est. {game.year}
        </span>
        <h3 className={cn('mt-2 font-bold leading-[.95] tracking-[-.04em] text-white', grand ? 'text-[clamp(2.4rem,4.2vw,3.8rem)]' : 'text-[clamp(1.7rem,2.4vw,2.4rem)]')}>
          {game.title}
        </h3>
        {grand && game.featuredNote && (
          <p className="serif-accent mt-3 max-w-xl text-lg leading-7 text-white/75 sm:text-xl">\u201c{game.featuredNote}\u201d</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Stars value={game.rating} />
          <span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/80">{game.platform}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">{game.hours} hrs</span>
          <span className="ml-auto hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[.2em] text-cyan-200 opacity-0 transition duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 sm:flex">
            Dossier <ArrowUpRight size={14} />
          </span>
        </div>
      </div>
    </motion.button>
  );
}

function GalleryPoster({ game, index, grand, onOpen }: { game: Game; index: number; grand: boolean; onOpen: () => void }) {
  return (
    <PosterShell game={game} index={index} grand={grand} onOpen={onOpen}>
      <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 transition duration-[1100ms] ease-out group-hover:scale-[1.05]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
    </PosterShell>
  );
}

function IntroPanel({ count }: { count: number }) {
  return (
    <div aria-hidden className="hidden shrink-0 select-none flex-col justify-end pb-10 pr-[2vw] lg:flex">
      <span className="font-mono text-[10px] uppercase tracking-[.34em] text-white/45">The wall of</span>
      <span className="mt-2 block text-[clamp(3rem,5vw,5.4rem)] font-bold leading-[.9] tracking-[-.05em] text-white">Induction<span className="serif-accent font-normal text-gradient">s</span></span>
      <span className="mt-4 max-w-[220px] font-mono text-[11px] uppercase leading-relaxed tracking-[.2em] text-white/45">{count} pieces · scroll to walk the wall</span>
    </div>
  );
}


export function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 }); const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      // Measure once on entry; reading the rect on every move forces layout.
      onPointerEnter={(e) => { if (e.pointerType !== 'mouse') return; rectRef.current = ref.current?.getBoundingClientRect() ?? null; }}
      onPointerMove={(e) => { const r = rectRef.current; if (e.pointerType !== 'mouse' || !r) return;
        ry.set(((e.clientX - r.left) / r.width - .5) * 7);
        rx.set(-((e.clientY - r.top) / r.height - .5) * 7); }}
      onPointerLeave={() => { rectRef.current = null; rx.set(0); ry.set(0); }}
    >{children}</motion.div>
  );
}
