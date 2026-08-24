import { Archive, ChevronRight, LogIn, Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';
import { isDemoMode } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useDialogA11y } from '../lib/useDialogA11y';
import { Button, ThemeToggle } from './ui';

/** Hairline reading-progress bar pinned under the header. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 180, damping: 30, mass: 0.4 });
  if (reduce) return null;
  return (
    <motion.div
      aria-hidden
      className="fixed inset-x-0 top-[71px] z-50 h-[2px] origin-left bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400"
      style={{ scaleX }}
    />
  );
}

const drawerLinks = (path: string): Array<[string, string]> =>
  path.startsWith('/u/')
    ? [['Rig', '#rig'], ['Hall of Fame', '#featured'], ['Chronicle', '#chronicle'], ['AI Guide', '#guide']]
    : [['Showcase', '/u/nova'], ['Dashboard', '/dashboard']];

function MobileNav({ open, close }: { open: boolean; close: () => void }) {
  const reduce = useReducedMotion();
  const location = useLocation();
  const links = drawerLinks(location.pathname);
  const auth = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  useDialogA11y(drawerRef, open, close);

  // Lock body scroll while the drawer owns the screen.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <button aria-label="Close navigation" className="absolute inset-0 bg-[#04060d]/70 backdrop-blur-md" onClick={close} />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="absolute inset-y-0 right-0 flex w-[min(86vw,360px)] flex-col border-l border-white/10 bg-canvas/95 px-6 pb-[calc(24px+env(safe-area-inset-bottom))] pt-[calc(20px+env(safe-area-inset-top))] backdrop-blur-2xl"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            drag={reduce ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ right: 0.6, left: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 60 || info.velocity.x > 500) close();
            }}
          >
            <div className="mb-8 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[.3em] text-cyan-200">Navigate</span>
              <Button className="icon-btn" aria-label="Close navigation" onClick={close}><X size={19} /></Button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col">
              {links.map(([label, to], i) => (
                <motion.div
                  key={to}
                  initial={reduce ? false : { opacity: 0, x: 42 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.06 + i * 0.055, type: 'spring', stiffness: 300, damping: 26 }}
                >
                  {to.startsWith('#') ? (
                    <a href={to} onClick={close} className="group flex min-h-16 items-center justify-between border-b border-white/10 text-[1.65rem] font-semibold tracking-tight">
                      {label}<ChevronRight size={20} className="text-cyan-200 transition group-hover:translate-x-1" />
                    </a>
                  ) : (
                    <Link to={to} onClick={close} className="group flex min-h-16 items-center justify-between border-b border-white/10 text-[1.65rem] font-semibold tracking-tight">
                      {label}<ChevronRight size={20} className="text-cyan-200 transition group-hover:translate-x-1" />
                    </Link>
                  )}
                </motion.div>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-4 pt-8">
              <ThemeToggle />
              {!auth.isAuthenticated && (
                <Button className="btn-primary w-full" onClick={() => { close(); auth.login(); }}>
                  <LogIn size={17} /> Sign in to build yours
                </Button>
              )}
              <p className="muted text-center font-mono text-[10px] uppercase tracking-[.25em]">SavePoint · Player archives</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Shell() {
  const [open, setOpen] = useState(false); const auth = useAuth(); const location = useLocation();
  const links = drawerLinks(location.pathname);
  // Close the drawer whenever the route changes so deep links never trap it open.
  useEffect(() => { setOpen(false); }, [location.pathname, location.hash]);

  return <>
    <ScrollProgress />
    <a href="#main" className="skip-link">Skip to content</a>
    <header className="sticky top-0 z-50 border-b border-white/10 bg-canvas/75 backdrop-blur-xl">
      <div className="container-shell flex h-[72px] items-center gap-4">
        <Link to="/" className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight"><span className="grid h-9 w-9 place-items-center rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-300"><Archive size={19} /></span><span>Save<span className="text-gradient">Point</span></span></Link>
        {isDemoMode && <span className="hidden rounded-full border border-violet-400/30 bg-violet-400/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[.16em] text-violet-300 sm:inline">Safe demo</span>}
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">{links.map(([label, to]) => to.startsWith('#') ? <a className="btn border-0 bg-transparent text-sm" key={to} href={to}>{label}</a> : <NavLink className={({ isActive }) => `btn border-0 bg-transparent text-sm transition-colors ${isActive ? 'text-cyan-300' : ''}`} key={to} to={to}>{label}</NavLink>)}</nav>
        <div className="ml-auto flex gap-2 md:ml-2"><ThemeToggle />{auth.isAuthenticated ? <Link className="btn !hidden sm:!inline-flex" to="/dashboard">Studio <ChevronRight size={16} /></Link> : <Button className="!hidden sm:!inline-flex" onClick={() => auth.login()}><LogIn size={16} /> Sign in</Button>}<Button className="icon-btn md:hidden" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={20} /></Button></div>
      </div>
    </header>
    <MobileNav open={open} close={() => setOpen(false)} />
    <main id="main"><Outlet /></main>
    <footer className="container-shell flex flex-col gap-4 border-t border-white/10 py-10 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-2">
        <span>© {new Date().getFullYear()} SavePoint Archive</span>
        <Link to="/onboarding" style={{ color: 'var(--cyan)' }} className="group inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[.18em] transition hover:opacity-80">
          Want your own? Make yours
          <ChevronRight size={13} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      <span className="font-mono text-xs">BUILT FOR THE GAMES THAT STAY</span>
    </footer>
  </>;
}
