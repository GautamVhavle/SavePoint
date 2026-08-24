import { Archive, ChevronRight, LogIn, Menu, X, ArrowRight } from 'lucide-react';
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

interface NavLink { label: string; to: string; anchor: boolean }

const drawerLinks = (path: string): NavLink[] =>
  path.startsWith('/u/')
    ? [
        { label: 'Rig', to: '#rig', anchor: true },
        { label: 'Hall of Fame', to: '#featured', anchor: true },
        { label: 'Chronicle', to: '#chronicle', anchor: true },
        { label: 'AI Guide', to: '#guide', anchor: true },
      ]
    : [
        { label: 'Showcase', to: '/u/nova', anchor: false },
        { label: 'Dashboard', to: '/dashboard', anchor: false },
      ];

function MobileNav({ open, close }: { open: boolean; close: () => void }) {
  const reduce = useReducedMotion();
  const location = useLocation();
  const links = drawerLinks(location.pathname);
  const auth = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  // The full-screen overlay owns the click-away backdrop, so it — not the
  // page body — is the boundary the inert sweep stops at.
  const overlayRef = useRef<HTMLDivElement>(null);
  // The hook also traps focus, occludes the page, and locks body scroll.
  useDialogA11y(drawerRef, open, close, overlayRef);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="fixed inset-0 z-[80] md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.2 }}
        >
          <button aria-label="Close navigation" className="absolute inset-0 bg-[#04060d]/70 backdrop-blur-md" onClick={close} />
          <motion.div
            id="mobile-nav"
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
              {links.map(({ label, to, anchor }, i) => (
                <motion.div
                  key={to}
                  initial={reduce ? false : { opacity: 0, x: 42 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: reduce ? 0 : 0.06 + i * 0.055, type: 'spring', stiffness: 300, damping: 26 }}
                >
                  {anchor ? (
                    <a href={to} onClick={close} className="group flex min-h-16 items-center justify-between border-b border-white/10 text-[1.65rem] font-semibold tracking-tight">
                      {label}<ChevronRight size={20} className="text-cyan-200 transition group-hover:translate-x-1" />
                    </a>
                  ) : (
                    <Link to={to} onClick={close} aria-current={location.pathname === to ? 'page' : undefined} className={`group flex min-h-16 items-center justify-between border-b border-white/10 text-[1.65rem] font-semibold tracking-tight ${location.pathname === to ? 'text-cyan-300' : ''}`}>
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
        <nav className="ml-auto hidden items-center gap-1 md:flex" aria-label="Primary">{links.map(({ label, to, anchor }) => anchor ? <a className="btn border-0 bg-transparent text-sm" key={to} href={to}>{label}</a> : <NavLink className={({ isActive }) => `btn border-0 bg-transparent text-sm transition-colors ${isActive ? 'text-cyan-300' : ''}`} key={to} to={to}>{label}</NavLink>)}</nav>
        <div className="ml-auto flex gap-2 md:ml-2"><ThemeToggle />{auth.isAuthenticated ? <Link className="btn !hidden sm:!inline-flex" to="/dashboard">Studio <ChevronRight size={16} /></Link> : <Button className="!hidden sm:!inline-flex" onClick={() => auth.login()}><LogIn size={16} /> Sign in</Button>}<Button className="icon-btn md:hidden" aria-label="Open navigation" aria-expanded={open} aria-controls="mobile-nav" aria-haspopup="dialog" onClick={() => setOpen(true)}><Menu size={20} /></Button></div>
      </div>
    </header>
    <MobileNav open={open} close={() => setOpen(false)} />
    <main id="main"><Outlet /></main>
    <footer className="border-t border-white/10">
      <div className="container-shell py-16 sm:py-24">
        <div className="eyebrow">Every player keeps something worth keeping</div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-8">
          <h2 className="max-w-3xl text-[clamp(2.6rem,7vw,6rem)] font-bold leading-[.94] tracking-[-.05em]">
            Your archive<br />
            <span className="serif-accent font-normal text-gradient">awaits.</span>
          </h2>
          <Link to="/onboarding" className="btn btn-primary !px-7 !py-3.5 text-base">
            Start yours free <ArrowRight size={18} />
          </Link>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-ink/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} SavePoint Archive</span>
          <span className="font-mono text-xs tracking-wider">BUILT FOR THE GAMES THAT STAY</span>
        </div>
      </div>
    </footer>
  </>;
}
