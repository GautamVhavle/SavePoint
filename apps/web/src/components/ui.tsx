import { createContext, useContext, useEffect, useState, type ButtonHTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { CheckCircle2, Moon, Sun, X } from 'lucide-react';
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

type ToastValue = { show: (message: string) => void };
const ToastContext = createContext<ToastValue>({ show: () => undefined });
export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState('');
  useEffect(() => { if (!message) return; const id = setTimeout(() => setMessage(''), 3500); return () => clearTimeout(id); }, [message]);
  return <ToastContext.Provider value={{ show: setMessage }}>{children}{message && <div className="toast glass flex items-center gap-3" role="status"><CheckCircle2 size={19} className="text-cyan-300"/><span className="flex-1">{message}</span><button aria-label="Dismiss notification" className="min-h-11 min-w-11" onClick={() => setMessage('')}><X size={17}/></button></div>}</ToastContext.Provider>;
}
export const useToast = () => useContext(ToastContext);

export function CoverImage({ src, alt, className = '', ...data }: { src: string; alt: string; className?: string } & Record<`data-${string}`, string | undefined>) { const [failed, setFailed] = useState(false); return <div {...data} className={cn('bg-gradient-to-br from-cyan-950 via-violet-950 to-fuchsia-950', className)}>{!failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover"/>}</div>; }
export function StatusPill({ children }: PropsWithChildren) { return <span className="inline-flex min-h-7 items-center rounded-full border border-white/10 bg-black/35 px-2.5 font-mono text-[10px] uppercase tracking-wider text-white">{children}</span>; }
