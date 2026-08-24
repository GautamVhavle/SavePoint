import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, Medal, X } from 'lucide-react';
import { Stars } from './Stars';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import type { Game } from '../../types';
import { formatDate } from '../../lib/utils';
import { useDialogA11y } from '../../lib/useDialogA11y';
import { Button, CoverImage, StatusPill } from '../../components/ui';
import { loadGsap } from './load-gsap';

export function GameDetail({ game, close, onStep, showStepper = false, position = 0, total = 0 }: { game: Game; close: () => void; onStep?: (delta: number) => void; showStepper?: boolean; position?: number; total?: number }) {
  const panel = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // Stepping into a new entry starts at its masthead, never mid-scroll.
  useEffect(() => { overlayRef.current?.scrollTo({ top: 0 }); }, [game.id]);
  // Traps focus, occludes the archive behind, locks scroll, closes on Escape.
  useDialogA11y(panel, true, close);
  // Arrow keys browse the collection like gallery walls.
  useEffect(() => {
    if (!onStep) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); onStep(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); onStep(-1); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onStep]);
  useEffect(() => {
    if (!panel.current || reduce) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    void loadGsap().then(({ gsap }) => {
      if (cancelled || !panel.current) return;
      ctx = gsap.context(() => { gsap.fromTo(panel.current, { rotationY: -92, transformPerspective: 1400, opacity: .4 }, { rotationY: 0, opacity: 1, duration: .72, ease: 'power3.out' }); }, panel);
    });
    return () => { cancelled = true; ctx?.revert(); };
  }, [game.id, reduce]);
  const tone = STATUS_COLORS[game.status];
  const accession = `SP-${game.year ?? '????'}-${game.id.replaceAll('-','').slice(0,6).toUpperCase()}`;
  const contentStagger = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.07 } } };
  const rise = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: .45, ease: [.22,.61,.36,1] } } };
  return (
    <motion.div ref={overlayRef} className="fixed inset-0 z-[80] overflow-y-auto bg-[#03050b]/88 p-3 backdrop-blur-xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="game-title" aria-describedby={game.summary ? 'game-summary' : undefined} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if(e.target===e.currentTarget) close(); }}>
      <div ref={panel} className="glass relative mx-auto max-w-5xl overflow-hidden rounded-[28px]">
        <div className="relative">
          <div aria-hidden className="pointer-events-none"><CoverImage src={game.banner || game.cover} alt="" priority className="pointer-events-none aspect-[4/3] max-h-[300px] w-full sm:aspect-[21/8] sm:max-h-[360px]" /></div>
          <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/35 to-transparent" />
          <Button className="icon-btn absolute right-4 top-4 z-10 bg-black/55 text-white" onClick={close} aria-label="Close game details" data-autofocus><X size={20}/></Button>
          {showStepper&&<>
            <button type="button" aria-label="Previous game" aria-keyshortcuts="ArrowLeft" onClick={()=>onStep?.(-1)} className="icon-btn glass absolute left-3 top-3 z-10 rounded-full sm:left-4 sm:top-4"><ChevronDown size={19} className="rotate-90"/></button>
            <button type="button" aria-label="Next game" aria-keyshortcuts="ArrowRight" onClick={()=>onStep?.(1)} className="icon-btn glass absolute right-16 top-3 z-10 rounded-full sm:right-20 sm:top-4"><ChevronDown size={19} className="-rotate-90"/></button>
          </>}
          <p role="status" className="sr-only">{game.title}</p>
          <motion.div className="absolute bottom-0 left-0 right-0 p-5 sm:p-9" variants={contentStagger} initial="hidden" animate="show">
            <motion.div variants={rise} className="eyebrow">Accession {accession}{showStepper && <> · Nº {String(position + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}</>}</motion.div>
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
            <p id="game-summary" className="mt-4 text-sm leading-7 text-white/80">{game.summary || 'Official record pending first IGDB snapshot.'}</p>
            {!!game.genres.length && <div className="mt-5 flex flex-wrap gap-1.5">{game.genres.map(g => <StatusPill key={g}>{g}</StatusPill>)}</div>}
            {!!game.platforms.length && <p className="muted mt-4 font-mono text-[11px] leading-5">ALSO ON · {game.platforms.join(' · ')}</p>}
            <p className="muted mt-6 border-t border-white/10 pt-4 font-mono text-[10px] leading-5">METADATA SNAPSHOT VIA IGDB · CAPTURED WHEN THIS ENTRY WAS FILED</p>
          </motion.aside>
        </motion.div>
      </div>
    </motion.div>);
}
