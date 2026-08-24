import { memo, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx as cn } from 'clsx';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import gsap from 'gsap';
import { ArrowUpRight, Bot, Check, ChevronDown, Cpu, Gamepad2, MapPin, Medal, Search, Share2, SlidersHorizontal, Sparkles, Star, X, Zap } from 'lucide-react';
import { api, ApiError, isDemoMode } from '../lib/api';
import type { Game } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';
import { formatDate } from '../lib/utils';
import { useDialogA11y } from '../lib/useDialogA11y';
import { Button, CoverImage, Panel, SectionHead, StatusPill, useToast } from '../components/ui';

const MotionSection = ({ children, className = '', id, watermark }: { children: React.ReactNode; className?: string; id?: string; watermark?: string }) => { const reduce = useReducedMotion(); return <motion.section id={id} className={cn('relative', className)} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .55 }}>{watermark && <span aria-hidden className="watermark">{watermark}</span>}{children}</motion.section>; };

function LoadingProfile() { return <div className="container-shell py-24" role="status"><div className="skeleton h-8 w-40 rounded-xl"/><div className="skeleton mt-8 h-64 rounded-[30px]"/><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-80 rounded-3xl"/>)}</div><span className="sr-only">Loading player archive</span></div>; }

/** Orchestrated masthead entrance: one cinematic moment, not scattered effects. */
function useMastheadCinema(root: React.RefObject<HTMLDivElement | null>, statsRef: React.RefObject<HTMLDivElement | null>, ready: boolean) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!root.current) return;
    const ctx = gsap.context((self) => {
      const q = self.selector!;
      if (reduce) {
        gsap.set(q('[data-cinema]'), { autoAlpha: 1, y: 0 });
        return;
      }
      gsap.fromTo(q('[data-banner-zoom]'), { scale: 1.14 }, { scale: 1, duration: 1.6, ease: 'power2.out' });
      gsap.fromTo(q('[data-cinema]'),
        { autoAlpha: 0, y: 34 },
        { autoAlpha: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.11, delay: 0.15 });
      gsap.registerPlugin(ScrollTrigger);
      gsap.to(q('[data-banner-parallax]'), {
        yPercent: 14, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
      });
      const counters = statsRef.current?.querySelectorAll<HTMLElement>('[data-count]');
      counters?.forEach((el) => {
        const target = Number(el.dataset.count ?? 0);
        gsap.fromTo(el, { innerText: 0 }, {
          innerText: target, duration: 1.4, delay: 0.5, ease: 'power1.out', snap: { innerText: 1 },
          onUpdate() { el.textContent = Math.round(Number(el.innerText)).toLocaleString('en-US'); },
        });
      });
    }, root);
    return () => ctx.revert();
  }, [reduce, root, statsRef, ready]);
}

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
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

const Stars = memo(function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">Unrated</span>;
  const filled = Math.round(value);
  return <span className="flex items-center gap-0.5" role="img" aria-label={`Rated ${value} out of 5`}>{[1,2,3,4,5].map(n => (
    <Star key={n} size={12} aria-hidden className={n <= filled ? 'text-amber-300' : 'text-white/25'} fill={n <= filled ? 'currentColor' : 'none'} />
  ))}</span>;
});

const GameCard = memo(function GameCard({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      layout
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`}
      className={`card-sheen group relative aspect-[3/4] overflow-hidden rounded-[20px] border text-left shadow-card transition-colors sm:aspect-[4/4.6] sm:min-h-64 sm:rounded-[24px] ${game.featured ? 'holo-ring border-transparent' : 'border-white/15'}`}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      {/* Mobile: box art already carries the name, so let it speak alone.
          Desktop: wide banner art under the full stat overlay. */}
      <CoverImage src={game.cover} alt={`${game.title} cover artwork`} className="absolute inset-0 transition duration-700 group-hover:scale-[1.05]" />
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

function GameDetail({ game, close }: { game: Game; close: () => void }) {
  const panel = useRef<HTMLDivElement>(null); const reduce = useReducedMotion();
  useDialogA11y(panel, true, close);
  // Freeze the archive behind the dossier so wheel/keyboard never scrolls it.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => { if (!panel.current || reduce) return; const ctx = gsap.context(() => { gsap.fromTo(panel.current, { rotationY: -92, transformPerspective: 1400, opacity: .4 }, { rotationY: 0, opacity: 1, duration: .72, ease: 'power3.out' }); }, panel); return () => ctx.revert(); }, [game.id, reduce]);
  const tone = STATUS_COLORS[game.status];
  const accession = `SP-${game.year ?? '????'}-${game.id.replaceAll('-','').slice(0,6).toUpperCase()}`;
  const contentStagger = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.07 } } };
  const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: .45, ease: [.22,.61,.36,1] } } };
  return (
    <motion.div className="fixed inset-0 z-[80] overflow-y-auto bg-[#03050b]/88 p-3 backdrop-blur-xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="game-title" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if(e.target===e.currentTarget) close(); }}>
      <div ref={panel} className="glass relative mx-auto max-w-5xl overflow-hidden rounded-[28px]">
        <div className="relative">
          <div aria-hidden className="pointer-events-none"><CoverImage src={game.banner || game.cover} alt="" priority className="pointer-events-none aspect-[4/3] max-h-[300px] w-full sm:aspect-[21/8] sm:max-h-[360px]" /></div>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/35 to-transparent" />
          <Button className="icon-btn absolute right-4 top-4 z-10 bg-black/55 text-white" onClick={close} aria-label="Close game details" data-autofocus><X size={20}/></Button>
          <motion.div className="absolute bottom-0 left-0 right-0 p-5 sm:p-9" variants={contentStagger} initial="hidden" animate="show">
            <motion.div variants={rise} className="eyebrow">Accession {accession}</motion.div>
            <motion.h2 variants={rise} id="game-title" className="mt-3 max-w-3xl text-3xl font-bold leading-[.95] tracking-[-.04em] text-white sm:text-6xl">{game.title}</motion.h2>
          </motion.div>
        </div>
        <motion.div className="grid gap-8 p-5 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:gap-10" variants={contentStagger} initial="hidden" animate="show">
          <motion.div variants={rise}>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 border-b border-white/10 pb-6">
              <div><span className="label">RATING</span><span className="flex items-center gap-2"><Stars value={game.rating} />{game.rating != null && <b className="text-lg">{game.rating.toFixed(1)}</b>}</span></div>
              <div><span className="label">PLAYTIME</span><b className="text-lg">{game.hours}<small className="muted ml-1 text-xs font-normal">hrs</small></b></div>
              <div><span className="label">STATUS</span><b className="inline-flex items-center gap-2 text-sm"><span className="inline-block h-2 w-2 rounded-full" style={{ background: tone.core, boxShadow: `0 0 8px ${tone.core}` }} />{STATUS_LABELS[game.status]}</b></div>
              <div><span className="label">PLAYED ON</span><b className="text-sm">{game.platform}</b></div>
            </div>
            {game.award && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/5 p-4"><Medal className="text-amber-300"/><div><span className="label mb-0.5">CURATOR AWARD</span><b>{game.award}</b>{game.awardNote && <p className="muted mt-1 text-sm leading-6">{game.awardNote}</p>}</div></div>}
            <h3 className="mb-3 mt-7 text-lg font-semibold">Field notes</h3>
            <p className="prose-review">{game.review || 'No notes recorded for this entry yet.'}</p>
            {(game.startedAt || game.completedAt) && <p className="muted mt-6 font-mono text-[11px] uppercase tracking-wider">Journey {formatDate(game.startedAt) || 'unlogged'} → {formatDate(game.completedAt) || 'present'}</p>}
          </motion.div>
          <motion.aside variants={rise} className="rounded-[22px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm sm:p-6">
            <div className="eyebrow">Archive record</div>
            {game.cover && !game.banner && <CoverImage src={game.cover} alt="" className="mt-4 aspect-[3/4] w-32 rounded-xl border border-white/15" />}
            <p className="mt-4 text-sm leading-7 text-white/80">{game.summary || 'Official record pending first IGDB snapshot.'}</p>
            {!!game.genres.length && <div className="mt-5 flex flex-wrap gap-1.5">{game.genres.map(g => <StatusPill key={g}>{g}</StatusPill>)}</div>}
            {!!game.platforms.length && <p className="muted mt-4 font-mono text-[11px] leading-5">ALSO ON · {game.platforms.join(' · ')}</p>}
            <p className="muted mt-6 border-t border-white/10 pt-4 font-mono text-[10px] leading-5">METADATA SNAPSHOT VIA IGDB · CAPTURED WHEN THIS ENTRY WAS FILED</p>
          </motion.aside>
        </motion.div>
      </div>
    </motion.div>);
}

function TickerStrip({ games }: { games: Game[] }) {
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
const GrandExhibit = memo(function GrandExhibit({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`}
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
const HallPlaque = memo(function HallPlaque({ game, index, onOpen }: { game: Game; index: number; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`}
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

function TiltCard({ children }: { children: ReactNode }) {
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

function Guide({ handle }: { handle: string }) {
  const [question,setQuestion]=useState('What should I play next based on this archive?'); const [answer,setAnswer]=useState(''); const [loading,setLoading]=useState(false); const controller=useRef<AbortController>();
  // Cancel an in-flight guide call when the section unmounts mid-request;
  // a mounted flag (not the abort signal) gates state updates because the
  // Stop button aborts too and must return the UI to idle.
  const mounted=useRef(true);
  useEffect(()=>()=>{mounted.current=false;controller.current?.abort();},[]);
  const ask=async()=>{controller.current?.abort(); const current=new AbortController(); controller.current=current; setLoading(true);setAnswer(''); try{const r=await api.guide(handle,question,current.signal);if(!mounted.current)return;setAnswer(r.answer)}catch(e){if(mounted.current&&(e as Error).name!=='AbortError')setAnswer('The Guide lost its signal. Try again in a moment.')}finally{if(mounted.current)setLoading(false)}};
  return <Panel className="relative overflow-hidden p-5 sm:p-8"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"/><div className="relative grid gap-7 lg:grid-cols-[.7fr_1.3fr]"><div><div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/30 bg-violet-300/10 text-violet-300"><Bot/></div><h3 className="mt-5 text-2xl font-semibold">Ask the archive</h3><p className="muted mt-2 leading-7">A profile-scoped guide grounded only in this curator’s games, ratings, and field notes.</p><span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-violet-300"><Sparkles size={13}/> Generated guidance</span></div><div><label className="label" htmlFor="guide-question">YOUR QUESTION</label><textarea id="guide-question" className="field" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&!loading&&question.trim())void ask();}} aria-keyshortcuts="Control+Enter Meta+Enter" maxLength={300}/><p aria-hidden className="muted mt-1 text-right font-mono text-[10px]">{300-question.length} left</p><div className="mt-3 flex flex-wrap gap-2"><Button className="btn-primary" onClick={ask} disabled={loading||!question.trim()}>{loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"/>Consulting</>:<><Zap size={16}/>Ask Guide</>}</Button>{loading&&<Button onClick={()=>controller.current?.abort()}>Stop</Button>}</div>{loading&&<div role="status" aria-label="Guide is thinking" className="mt-5 space-y-2.5 rounded-2xl border border-violet-300/15 bg-violet-300/5 p-5"><div className="h-3 w-[85%] animate-pulse rounded bg-white/10"/><div className="h-3 w-full animate-pulse rounded bg-white/10 [animation-delay:120ms]"/><div className="h-3 w-[70%] animate-pulse rounded bg-white/10 [animation-delay:240ms]"/></div>}{answer&&<motion.div role="status" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="mt-5 whitespace-pre-line rounded-2xl border border-violet-300/20 bg-violet-300/5 p-5 leading-7">{answer.replaceAll('**','')}<div className="muted mt-4 border-t border-white/10 pt-3 font-mono text-[10px]">SOURCES · THIS PROFILE ONLY</div></motion.div>}</div></div></Panel>;
}

export default function PublicProfile() {
  const [copied,setCopied]=useState(false); const toast=useToast();
  const mastheadRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const { handle='nova' }=useParams(); const [params]=useSearchParams(); const navigate=useNavigate(); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('Newest'); const [search,setSearch]=useState('');
  const query=useQuery({queryKey:['public-profile',handle],queryFn:({signal})=>api.publicProfile(handle,signal),retry:(count,e)=>!(e instanceof ApiError&&e.status===404)&&count<2});
  useMastheadCinema(mastheadRef, statsRef, !query.isPending && !query.isError);
  const games=useMemo(()=>{const list=(query.data?.games??[]).filter(g=>(filter==='all'||g.status===filter)&&g.title.toLowerCase().includes(search.toLowerCase()));return [...list].sort((a,b)=>sort==='Rating'?((b.rating??0)-(a.rating??0)):sort==='Title'?a.title.localeCompare(b.title):((b.year??0)-(a.year??0)))},[query.data,filter,sort,search]);
  const selected=query.data?.games.find(g=>g.slug===params.get('game'));
  // Stable identities so memoized exhibit cards skip re-render while filters/search type.
  const open=useCallback((g:Game)=>navigate({search:`?game=${g.slug}`},{replace:false}),[navigate]);
  const close=useCallback(()=>navigate({search:''},{replace:true}),[navigate]);
  if(query.isPending)return <LoadingProfile/>; if(query.isError){const notFound=query.error instanceof ApiError&&query.error.status===404;return <div className="container-shell grid min-h-[65vh] place-items-center text-center"><div><div className="eyebrow justify-center">{notFound?'404 · Uncharted player':'Signal interrupted'}</div><h1 className="mt-5 text-5xl font-bold">{notFound?'This archive is sealed.':'Could not reach the archive.'}</h1><p className="muted mt-4">{notFound?'Check the handle and try another route.':'Your connection may have drifted. Retry when ready.'}</p><div className="mt-7 flex flex-wrap justify-center gap-3">{notFound
    ? <><Link className="btn btn-primary" to="/">Return home</Link>{isDemoMode&&<Link className="btn" to="/u/nova">Try the showcase archive</Link>}</>
    : <Button className="btn-primary" onClick={()=>query.refetch()}>Retry</Button>}</div></div></div>};
  const p=query.data; const featured=p.featuredOrder.map(id=>p.games.find(g=>g.id===id)).filter(Boolean) as Game[];
  
  const shareProfile=async()=>{const url=`${location.origin}/u/${p.handle}`;try{
    if(navigator.share){await navigator.share({title:`${p.displayName} on SavePoint`,text:`${p.displayName}'s gaming archive`,url});}
    else if(navigator.clipboard){await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800);}
    else{toast.show('Sharing is unavailable here — copy the address bar URL instead.','error');}
  }catch(error){ if((error as Error)?.name!=='AbortError') toast.show('Could not complete the share.','error'); } };
  return <><Helmet><title>{p.displayName} (@{p.handle}), SavePoint</title><meta name="description" content={p.bio}/><link rel="canonical" href={`${location.origin}/u/${p.handle}`}/><meta property="og:type" content="profile"/><meta property="og:title" content={`${p.displayName} (@${p.handle}), SavePoint`}/><meta property="og:description" content={p.bio}/><meta property="og:url" content={`${location.origin}/u/${p.handle}`}/>{p.banner && <meta property="og:image" content={p.banner}/>}{p.banner && <meta property="og:image:alt" content={`${p.displayName}'s SavePoint portfolio`}/>}<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta name="twitter:card" content="summary_large_image"/></Helmet>
  <section className="container-shell pt-6 sm:pt-10"><Panel elemRef={mastheadRef} className="relative min-h-[540px] overflow-hidden bg-[#0b0f1c] sm:min-h-[560px]"><div data-banner-parallax className="absolute -inset-y-8 inset-x-0"><CoverImage src={p.banner} alt="" data-banner-zoom priority className="absolute inset-0 opacity-55"/></div><div className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/75 to-transparent"/><div className="relative flex min-h-[560px] max-w-3xl flex-col justify-end p-6 sm:p-12"><div className="mb-auto flex items-center gap-4"><CoverImage src={p.avatar} alt={`${p.displayName} avatar`} priority className="h-16 w-16 rounded-2xl border border-white/20"/><div><span className="font-mono text-xs text-cyan-200">@{p.handle}</span><p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14}/>{p.location}</p></div></div><div data-cinema className="eyebrow cinema-hidden">Player archive · est. {p.since}</div><h1 data-cinema className="cinema-hidden mt-4 text-[clamp(3rem,11vw,9rem)] font-bold leading-[.88] tracking-[-.07em] text-white">{p.displayName.split(' ').map((word, i, arr) => i === arr.length - 1 && arr.length > 1 ? <>{' '}{word}</> : <span key={i}>{i > 0 ? ' ' : ''}{word}</span>)}</h1><p data-cinema className="cinema-hidden mt-6 max-w-xl text-lg leading-8 text-white/75">{p.bio}</p><div className="mt-8 flex flex-wrap gap-3"><a href="#featured" className="btn btn-primary">Enter the collection <ChevronDown size={17}/></a><Button type="button" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={shareProfile}>{copied ? <Check size={17}/> : <Share2 size={17}/>}{copied ? 'Link copied' : 'Share archive'}</Button><div ref={statsRef} data-cinema className="cinema-hidden flex w-full items-end gap-7 border-t border-white/10 pt-5 sm:gap-10">{[[p.games.length,'GAMES'],[Math.round(p.games.reduce((n,g)=>n+(g.hours??0),0)),'HOURS LOGGED'],[p.games.filter(x=>x.award).length,'AWARDS']].map(([value,label]) => (<div key={label as string}><div className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-200/90">{label}</div><div className="mt-1 text-4xl font-bold leading-none tracking-tight text-white sm:text-5xl"><span data-count={value as number}>{(value as number).toLocaleString('en-US')}</span></div></div>))}</div></div></div></Panel></section>
  <MotionSection id="rig" className="section container-shell" watermark="THE RIG"><SectionHead kicker="01 · Battle station" title={<>The <span className="text-gradient">Rig</span></>} body="A deliberately tuned system. Every component documented like an artifact."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{p.rig.map((r,i)=><Reveal key={r.id} delay={(i%4)*0.06}><TiltCard><Panel className="group h-full p-5 transition hover:-translate-y-1"><div className="flex justify-between"><Cpu size={20} className={i%2?'text-violet-300':'text-cyan-300'}/><span className="font-mono text-[9px] text-ink/40">0{i+1}</span></div><span className="label mt-10">{r.category}</span><h3 className="text-lg font-semibold">{r.name}</h3><p className="muted mt-2 font-mono text-xs leading-5">{r.detail}</p></Panel></TiltCard></Reveal>)}</div>
  {!p.rig.length && <div className="glass rounded-[22px] p-10 text-center"><Cpu className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">The battle station is undocumented</h3><p className="muted mt-2">This curator has not filed their hardware yet.</p></div>}</MotionSection>
  {featured.length>0 && <TickerStrip games={featured}/>}
  <MotionSection id="featured" className="section container-shell" watermark="HALL OF FAME"><SectionHead kicker="02 · Hall of fame" title={<>The games that <span className="text-gradient">stayed</span></>} body="The permanent collection. The first inductee holds the grand exhibit; every plaque opens into complete field notes."/><div className="grid grid-cols-2 gap-3 sm:hidden">{featured.map((g,i)=><Reveal key={g.id} delay={(i%2)*0.07}><GameCard game={g} onOpen={open}/></Reveal>)}</div>
  <div className="hidden space-y-6 sm:block">
    {featured[0] && <Reveal><GrandExhibit game={featured[0]} onOpen={open}/></Reveal>}
    {featured.length > 1 && (
      <div className="grid gap-5 md:grid-cols-2">
        {featured.slice(1).map((g,i)=><Reveal key={g.id} delay={(i%2)*0.08}><HallPlaque game={g} index={i+1} onOpen={open}/></Reveal>)}
      </div>
    )}
  </div>
  {!featured.length && <div className="glass rounded-[22px] p-10 text-center"><Medal className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">No inductees yet</h3><p className="muted mt-2">The shelf awaits its first permanent resident.</p></div>}</MotionSection>
  <MotionSection id="chronicle" className="section container-shell" watermark="THE CHRONICLE"><SectionHead kicker="03 · Chronicle" title="Every save tells a story." body="The complete play history, arranged as a living catalog." action={<div className="flex gap-2"><span aria-live="polite" role="status" className="btn"><SlidersHorizontal size={15}/>{games.length} entries</span></div>}/><Panel className="p-4 sm:p-6"><div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="relative"><span className="sr-only">Search games</span><Search className="absolute left-3 top-3.5 text-ink/40" size={17}/><input className="field pl-10" placeholder="Search the chronicle" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="field min-w-40" aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','playing','completed','backlog','dropped'].map(x=><option key={x} value={x}>{x==='all'?'All':STATUS_LABELS[x as keyof typeof STATUS_LABELS]}</option>)}</select><select className="field min-w-40" aria-label="Sort games" value={sort} onChange={e=>setSort(e.target.value)}><option>Newest</option><option>Rating</option><option>Title</option></select></div><motion.div layout className="grid gap-3">{games.map(g=><motion.button layout key={g.id} onClick={()=>open(g)} aria-label={`Open ${g.title} details`} className="group relative grid min-h-24 grid-cols-[64px_1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-3 pl-4 text-left transition hover:border-white/25 hover:bg-white/5 sm:grid-cols-[72px_1fr_1fr_auto]">
<span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${STATUS_COLORS[g.status].core}, transparent)`, opacity:.85 }} />
<CoverImage src={g.banner || g.cover} alt="" className="h-20 rounded-xl"/><div><h3 className="font-semibold">{g.title}</h3><p className="muted mt-1 font-mono text-[10px]"><span style={{color:`var(--status-${g.status})`}}>{STATUS_LABELS[g.status]}</span> · {g.platform} · {g.year}</p></div><p className="muted hidden truncate text-sm sm:block">{g.genres.join(' · ')}</p><div className="flex items-center gap-3 text-right"><div><Stars value={g.rating} /><p className="muted mt-1 text-xs">{g.hours ?? 0} hrs</p></div><ArrowUpRight size={16} className="text-cyan-200 opacity-0 transition group-hover:opacity-100"/></div></motion.button>)}{!games.length&&<div className="py-16 text-center"><Gamepad2 className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl">No saves found</h3><p className="muted mt-2">Change the filter or search phrase.</p></div>}</motion.div></Panel></MotionSection>
  <MotionSection id="guide" className="section container-shell"><SectionHead kicker="04 · AI Guide" title={<>A compass for your <span className="text-gradient">next world</span>.</>} body="Questions answered from this portfolio, never from the wider internet."/><Guide handle={p.handle}/></MotionSection>
  <AnimatePresence>{selected&&<GameDetail game={selected} close={close}/>}</AnimatePresence></>;
}
