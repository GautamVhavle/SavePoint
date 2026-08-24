import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Moon, Sun, X } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../lib/utils';

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn('btn', className)} {...props}>{children}</button>; }
export function Panel({ children, className = '', elemRef }: PropsWithChildren<{ className?: string; elemRef?: React.Ref<HTMLDivElement> }>) { return <div ref={elemRef} className={cn('glass rounded-[22px]', className)}>{children}</div>; }
/** Soft route-entry motion for pages without their own entrance choreography. */
export function PageFade({ children, className = '' }: PropsWithChildren<{ className?: string }>) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: [.22, .61, .36, 1] }}>{children}</motion.div>;
}
export function SectionHead({ kicker, title, body, action }: { kicker: string; title: ReactNode; body?: string; action?: ReactNode }) { const reduce = useReducedMotion(); return <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end"><div className="max-w-3xl"><div className="eyebrow">{kicker}</div><motion.h2 className="section-title" initial={reduce?false:{clipPath:'inset(0 0 100% 0)',y:26}} whileInView={{clipPath:'inset(0 0 -8% 0)',y:0}} viewport={{once:true,margin:'-60px'}} transition={{duration:.7,ease:[.22,.61,.36,1]}}>{title}</motion.h2>{body && <p className="muted max-w-2xl text-base leading-7">{body}</p>}</div>{action}</div>; }

const ThemeContext = createContext<{ theme: string; toggle: () => void }>({ theme: 'dark', toggle: () => undefined });
export function ThemeProvider({ children }: PropsWithChildren) {
  const media = matchMedia('(prefers-color-scheme: light)');
  // 'system' tracks the OS live; only explicit toggles are persisted.
  const [preference, setPreference] = useState<'light' | 'dark' | 'system'>(
    () => (localStorage.getItem('savepoint-theme') as 'light' | 'dark' | null) ?? 'system');
  const [system, setSystem] = useState<'light' | 'dark'>(media.matches ? 'light' : 'dark');
  useEffect(() => {
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches ? 'light' : 'dark');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [media]);
  const theme = preference === 'system' ? system : preference;
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    // Address-bar chrome follows the RESOLVED theme, not just the OS scheme.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4efe6' : '#070a12');
    if (preference === 'system') localStorage.removeItem('savepoint-theme');
    else localStorage.setItem('savepoint-theme', preference);
  }, [theme, preference]);
  return <ThemeContext.Provider value={{ theme, toggle: () => setPreference(theme === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
}
export function ThemeToggle() { const { theme, toggle } = useContext(ThemeContext); return <Button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>{theme === 'dark' ? <Sun size={18}/> : <Moon size={18}/>}</Button>; }

type ToastTone = 'success' | 'error';
type ToastValue = { show: (message: string, tone?: ToastTone) => void };
const ToastContext = createContext<ToastValue>({ show: () => undefined });
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<{ message: string; tone: ToastTone; id: number } | null>(null);
  const timer = useRef<number>();
  const hide = useCallback(() => { window.clearTimeout(timer.current); setToast(null); }, []);
  const show = useCallback((message: string, tone: ToastTone = 'success') => {
    window.clearTimeout(timer.current);
    setToast({ message, tone, id: Date.now() });
    timer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const value = useMemo(() => ({ show }), [show]);
  return <ToastContext.Provider value={value}>{children}
    <div aria-live="polite" className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-full max-w-[380px] justify-end">
      {toast && <div key={toast.id} className="toast glass pointer-events-auto flex items-start gap-3 animate-toast-in" role="status">
        {toast.tone === 'error'
          ? <AlertTriangle size={19} className="mt-0.5 shrink-0 text-rose-300"/>
          : <CheckCircle2 size={19} className="mt-0.5 shrink-0 text-cyan-300"/>}
        <span className="flex-1 pt-0.5">{toast.message}</span>
        <button aria-label="Dismiss notification" className="-m-1 grid min-h-9 min-w-9 shrink-0 place-items-center rounded-lg transition hover:bg-white/10" onClick={hide}><X size={17}/></button>
      </div>}
    </div>
  </ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

export function CoverImage({ src, alt, className = '', priority = false, mobileSrc, ...data }: { src: string; alt: string; className?: string; priority?: boolean; mobileSrc?: string } & Record<`data-${string}`, string | undefined>) {
  const [failed, setFailed] = useState(false); const [loaded, setLoaded] = useState(false);
  // React 18's typings predate fetchPriority; the lowercase DOM form avoids
  // the unknown-prop warning while still raising scheduler priority.
  const fetchHint = priority ? ({ fetchpriority: 'high' } as Record<string, string>) : {};
  const image = <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" {...fetchHint} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
    className={cn('h-full w-full object-cover transition-opacity duration-700', loaded ? 'opacity-100' : 'opacity-0')} />;
  return <div {...data} className={cn('bg-gradient-to-br from-cyan-950 via-violet-950 to-fuchsia-950 overflow-hidden', className)}>
    {!failed && (mobileSrc && mobileSrc !== src
      ? <picture><source media="(max-width: 639px)" srcSet={mobileSrc} />{image}</picture>
      : image)}
  </div>; }
export function StatusPill({ children }: PropsWithChildren) { return <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-black/35 px-2.5 font-mono text-[10px] uppercase tracking-wider text-white">{children}</span>; }
