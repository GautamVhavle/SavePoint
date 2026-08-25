import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { CalendarCheck2, CalendarPlus2, ChevronLeft, ChevronRight, Clock3, Gamepad2, Medal, Star, X } from 'lucide-react';
import { Stars } from './Stars';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import type { Game } from '../../types';
import { formatDate } from '../../lib/utils';
import { useDialogA11y } from '../../lib/useDialogA11y';
import { CoverImage } from '../../components/ui';

interface StepperProps {
  onStep?: (delta: number) => void;
  showStepper?: boolean;
  position?: number;
  total?: number;
  prevTitle?: string;
  nextTitle?: string;
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <span className="label mb-1.5">{label}</span>
      <span className="flex min-h-7 items-center gap-2 text-[15px] font-semibold leading-none">{children}</span>
    </div>
  );
}

function Milestone({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-ink/10 bg-ink/[.04] text-cyan-300">{icon}</span>
      <span className="min-w-0">
        <span className="label mb-0.5">{label}</span>
        <b className="block truncate text-sm font-semibold">{value}</b>
      </span>
    </div>
  );
}

export function GameDetail({ game, close, onStep, showStepper = false, position = 0, total = 0, prevTitle, nextTitle }: { game: Game; close: () => void } & StepperProps) {
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

  const tone = STATUS_COLORS[game.status];
  const accession = `SP-${game.year ?? '????'}-${game.id.replaceAll('-', '').slice(0, 6).toUpperCase()}`;
  const started = formatDate(game.startedAt);
  const completed = formatDate(game.completedAt);
  const stagger = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: reduce ? 0 : 0.08 } } };
  const rise = { hidden: reduce ? {} : { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: .45, ease: [.22, .61, .36, 1] as const } } };
  const step = (delta: number) => onStep?.(delta);

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-[80] overflow-y-auto overscroll-contain bg-[#03050b]/90 backdrop-blur-xl sm:p-7"
      role="dialog" aria-modal="true" aria-labelledby="game-title" aria-describedby={game.summary ? 'game-summary' : undefined}
      initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: .2 }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <motion.div
        ref={panel}
        className="dossier glass relative mx-auto max-w-6xl overflow-hidden rounded-none sm:rounded-[28px]"
        initial={reduce ? false : { opacity: 0, y: 26, scale: .985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 28 }}
      >
        {/* Masthead: artwork dissolving into the record sheet. */}
        <header className="relative isolate">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <CoverImage src={game.banner || game.cover} alt="" priority className="h-full w-full" />
            {/* Weighted to the lower third: the title band stays readable
                while the top of the key art is left almost untouched. */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--sheet) 2%, rgba(3,5,11,.86) 24%, rgba(3,5,11,.4) 58%, rgba(3,5,11,.08))' }} />
            <div className="absolute inset-0 opacity-60" style={{ background: `linear-gradient(120deg, ${tone.soft}, transparent 55%)` }} />
          </div>
          <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: `linear-gradient(90deg, ${tone.core}, transparent 70%)` }} />

          {/* One control cluster, so nothing collides over the artwork. */}
          <div className="relative z-20 flex items-center gap-3 p-3 sm:p-5">
            <span className="hidden rounded-full border border-white/15 bg-black/45 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.18em] text-white/70 backdrop-blur-sm sm:inline-flex">
              Accession {accession}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {showStepper && (
                <div className="flex items-center gap-1 rounded-full border border-white/15 bg-black/45 p-1 backdrop-blur-sm">
                  <button
                    type="button" onClick={() => step(-1)} aria-label="Previous game" aria-keyshortcuts="ArrowLeft"
                    title={prevTitle ? `Previous · ${prevTitle}` : 'Previous game'}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/75 transition hover:bg-white/15 hover:text-white"
                  ><ChevronLeft size={18} /></button>
                  <span aria-hidden className="min-w-[3.5rem] text-center font-mono text-[10px] uppercase tracking-[.16em] text-white/60">
                    {String(position + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  <button
                    type="button" onClick={() => step(1)} aria-label="Next game" aria-keyshortcuts="ArrowRight"
                    title={nextTitle ? `Next · ${nextTitle}` : 'Next game'}
                    className="grid h-9 w-9 place-items-center rounded-full text-white/75 transition hover:bg-white/15 hover:text-white"
                  ><ChevronRight size={18} /></button>
                </div>
              )}
              <button
                type="button" onClick={close} aria-label="Close game details" data-autofocus
                className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-sm transition hover:bg-white/15"
              ><X size={19} /></button>
            </div>
          </div>
          <p role="status" className="sr-only">{game.title}</p>

          {/* Padding above the title reserves clear artwork, so the banner is
              never fully covered regardless of title length. */}
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            className="relative z-10 flex items-end gap-4 px-5 pb-6 pt-[clamp(6rem,19vw,12rem)] sm:gap-7 sm:px-9 sm:pb-8"
          >
            {game.cover && (
              <motion.div variants={rise} className="hidden w-28 shrink-0 overflow-hidden rounded-2xl border border-white/20 shadow-card sm:block lg:w-36">
                <CoverImage src={game.cover} alt="" className="aspect-[3/4] w-full" />
              </motion.div>
            )}
            <div className="min-w-0">
              <motion.div variants={rise} className="eyebrow" style={{ color: tone.core }}>
                {STATUS_LABELS[game.status]}{game.year ? ` · Est. ${game.year}` : ''}
              </motion.div>
              <motion.h2 variants={rise} id="game-title" className="mt-3 text-[clamp(2rem,6vw,4.25rem)] font-bold leading-[.94] tracking-[-.04em] text-white">
                {game.title}
              </motion.h2>
              <motion.p variants={rise} className="mt-3 font-mono text-[10px] uppercase tracking-[.16em] text-white/55 sm:hidden">
                Accession {accession}
              </motion.p>
            </div>
          </motion.div>
        </header>

        <div className="dossier-stats">
          <Stat label="RATING">
            {game.rating == null
              ? <span className="muted text-sm font-normal">Unrated</span>
              : <><Stars value={game.rating} size={14} /><b className="text-lg leading-none">{game.rating.toFixed(1)}</b></>}
          </Stat>
          <Stat label="PLAYTIME">
            <Clock3 size={15} aria-hidden className="text-cyan-300" />
            <span className="text-lg leading-none">{game.hours ?? 0}</span>
            <small className="muted text-xs font-normal">hrs</small>
          </Stat>
          <Stat label="STATUS">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: tone.core, boxShadow: `0 0 9px ${tone.core}` }} />
            {STATUS_LABELS[game.status]}
          </Stat>
          <Stat label="PLAYED ON">
            <Gamepad2 size={15} aria-hidden className="text-violet-300" />
            <span className="truncate">{game.platform}</span>
          </Stat>
        </div>

        <motion.div className="grid gap-8 p-5 sm:p-9 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,.85fr)] lg:gap-12" variants={stagger} initial="hidden" animate="show">
          <motion.div variants={rise} className="min-w-0">
            {game.award && (
              <div className="mb-8 flex items-start gap-4 rounded-2xl border border-amber-300/30 bg-gradient-to-br from-amber-300/[.12] to-transparent p-4 sm:p-5">
                <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-amber-300"><Medal size={20} /></span>
                <div className="min-w-0">
                  <span className="label mb-1">CURATOR AWARD</span>
                  <b className="block text-base leading-tight">{game.award}</b>
                  {game.awardNote && <p className="muted mt-1.5 text-sm leading-6">{game.awardNote}</p>}
                </div>
              </div>
            )}

            {game.featuredNote && (
              <blockquote className="dossier-quote relative mb-8 pl-8 pt-1">
                <p className="serif-accent text-xl leading-8 text-ink/85 sm:text-2xl sm:leading-9">{game.featuredNote}</p>
                <footer className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-cyan-300">
                  <Star size={11} fill="currentColor" aria-hidden /> Hall of fame
                </footer>
              </blockquote>
            )}

            <h3 className="mb-3 text-lg font-semibold tracking-tight">Field notes</h3>
            <p className="prose-review">{game.review || 'No notes recorded for this entry yet.'}</p>

            {(started || completed) && (
              <div className="mt-8 rounded-2xl border border-ink/10 bg-ink/[.03] p-4 sm:p-5">
                <span className="label mb-3">THE JOURNEY</span>
                <div className="dossier-journey">
                  <Milestone icon={<CalendarPlus2 size={16} />} label="STARTED" value={started || 'Unlogged'} />
                  <span aria-hidden className="dossier-journey-line" />
                  <Milestone icon={<CalendarCheck2 size={16} />} label={game.status === 'completed' ? 'COMPLETED' : 'LAST SAVE'} value={completed || 'In progress'} />
                </div>
              </div>
            )}
          </motion.div>

          <motion.aside variants={rise} className="min-w-0 self-start rounded-[22px] border border-ink/10 bg-ink/[.03] p-5 sm:p-6">
            <div className="eyebrow">Archive record</div>
            <p id="game-summary" className="mt-4 text-sm leading-7 text-ink/80">{game.summary || 'Official record pending first IGDB snapshot.'}</p>

            {!!game.genres.length && (
              <div className="mt-6">
                <span className="label mb-2">GENRES</span>
                <div className="flex flex-wrap gap-1.5">
                  {game.genres.map(genre => (
                    <span key={genre} className="inline-flex min-h-7 items-center rounded-full border border-ink/[.14] bg-ink/[.05] px-2.5 font-mono text-[10px] uppercase tracking-wider text-ink/85">{genre}</span>
                  ))}
                </div>
              </div>
            )}

            {!!game.platforms.length && (
              <div className="mt-6">
                <span className="label mb-2">ALSO AVAILABLE ON</span>
                <ul className="grid gap-1.5">
                  {game.platforms.map(platform => (
                    <li key={platform} className="flex items-center gap-2 font-mono text-[11px] leading-5 text-ink/70">
                      <span aria-hidden className="h-1 w-1 shrink-0 rounded-full bg-violet-300/70" />{platform}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="muted mt-7 border-t border-ink/10 pt-4 font-mono text-[10px] leading-5">
              {accession} · METADATA SNAPSHOT VIA IGDB, CAPTURED WHEN THIS ENTRY WAS FILED
            </p>
          </motion.aside>
        </motion.div>

        {/* Walk the collection. The header cluster owns the accessible
            controls; these wide targets are a redundant pointer affordance. */}
        {showStepper && (
          <div className="grid gap-px border-t border-ink/10 bg-ink/[.08] sm:grid-cols-2">
            <button
              type="button" onClick={() => step(-1)} tabIndex={-1} aria-hidden
              className="group flex min-h-20 items-center gap-3 bg-[var(--sheet)] px-5 py-4 text-left transition hover:bg-ink/[.05] sm:px-9"
            >
              <ChevronLeft size={18} className="shrink-0 text-cyan-300 transition group-hover:-translate-x-1" />
              <span className="min-w-0"><span className="label mb-0.5">PREVIOUS</span><b className="block truncate text-sm">{prevTitle ?? 'Earlier entry'}</b></span>
            </button>
            <button
              type="button" onClick={() => step(1)} tabIndex={-1} aria-hidden
              className="group flex min-h-20 items-center justify-end gap-3 bg-[var(--sheet)] px-5 py-4 text-right transition hover:bg-ink/[.05] sm:px-9"
            >
              <span className="min-w-0"><span className="label mb-0.5">NEXT</span><b className="block truncate text-sm">{nextTitle ?? 'Later entry'}</b></span>
              <ChevronRight size={18} className="shrink-0 text-cyan-300 transition group-hover:translate-x-1" />
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
