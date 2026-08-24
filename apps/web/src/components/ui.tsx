import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Moon, Sun, X } from 'lucide-react';
import { cn } from '../lib/utils';

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn('btn', className)} {...props}>{children}</button>; }
export function Panel({ children, className = '', elemRef }: PropsWithChildren<{ className?: string; elemRef?: React.Ref<HTMLDivElement> }>) { return <div ref={elemRef} className={cn('glass rounded-[22px]', className)}>{children}</div>; }
export function SectionHead({ kicker, title, body, action }: { kicker: string; title: ReactNode; body?: string; action?: ReactNode }) { return <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-end"><div className="max-w-3xl"><div className="eyebrow">{kicker}</div><h2 className="section-title">{title}</h2>{body && <p className="muted max-w-2xl text-base leading-7">{body}</p>}</div>{action}</div>; }

const ThemeContext = createContext<{ theme: string; toggle: () => void }>({ theme: 'dark', toggle: () => undefined });
export function ThemeProvider({ children }: PropsWithChildren) {
  const [theme, setTheme] = useState(() => localStorage.getItem('savepoint-theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('savepoint-theme', theme); }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggle: () => setTheme(v => v === 'dark' ? 'light' : 'dark') }}>{children}</ThemeContext.Provider>;
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

export function CoverImage({ src, alt, className = '', ...data }: { src: string; alt: string; className?: string } & Record<`data-${string}`, string | undefined>) { const [failed, setFailed] = useState(false); return <div {...data} className={cn('bg-gradient-to-br from-cyan-950 via-violet-950 to-fuchsia-950', className)}>{!failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover"/>}</div>; }
export function StatusPill({ children }: PropsWithChildren) { return <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-black/35 px-2.5 font-mono text-[10px] uppercase tracking-wider text-white">{children}</span>; }
