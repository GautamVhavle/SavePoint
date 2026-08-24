import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Check, Copy, Sparkles, Zap } from 'lucide-react';
import { Button, Panel } from '../../components/ui';
import { api } from '../../lib/api';
import { copyToClipboard } from '../../lib/clipboard';

export const SUGGESTIONS = [
  'What should I play next from this shelf?',
  'Which game here has the deepest hours behind it?',
  'Summarize this curator’s taste in one line.',
];

export function Guide({ handle }: { handle: string }) {
  const [question,setQuestion]=useState('What should I play next based on this archive?'); const [answer,setAnswer]=useState(''); const [loading,setLoading]=useState(false); const [copied,setCopied]=useState(false); const controller=useRef<AbortController>();
  // Cancel an in-flight guide call when the section unmounts mid-request;
  // a mounted flag (not the abort signal) gates state updates because the
  // Stop button aborts too and must return the UI to idle.
  const mounted=useRef(true);
  useEffect(()=>()=>{mounted.current=false;controller.current?.abort();},[]);
  const runAsk=async(q:string)=>{controller.current?.abort(); const current=new AbortController(); controller.current=current; setLoading(true);setAnswer(''); try{const r=await api.guide(handle,q,current.signal);if(!mounted.current)return;setAnswer(r.answer)}catch(e){if(mounted.current&&(e as Error).name!=='AbortError')setAnswer('The Guide lost its signal. Try again in a moment.')}finally{if(mounted.current)setLoading(false)}};
  const ask=()=>runAsk(question);
  // Suggestion chips are one-tap: they submit their own question.
  const askSuggestion=(s:string)=>{setQuestion(s);void runAsk(s);};
  return <Panel className="relative overflow-hidden p-5 sm:p-8"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"/><div className="relative grid gap-7 lg:grid-cols-[.7fr_1.3fr]"><div><div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/30 bg-violet-300/10 text-violet-300"><Bot/></div><h3 className="mt-5 text-2xl font-semibold">Ask the archive</h3><p className="muted mt-2 leading-7">A profile-scoped guide grounded only in this curator’s games, ratings, and field notes.</p><span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-violet-300"><Sparkles size={13}/> Generated guidance</span></div><div aria-busy={loading}><label className="label" htmlFor="guide-question">YOUR QUESTION</label><textarea id="guide-question" className="field" value={question} onChange={e=>setQuestion(e.target.value)} onKeyDown={e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&!loading&&question.trim())void ask();}} aria-keyshortcuts="Control+Enter Meta+Enter" maxLength={300} aria-describedby="guide-count"/><p id="guide-count" className="muted mt-1 text-right font-mono text-[10px]">{300-question.length} characters left</p><div className="mt-3 flex flex-wrap items-center gap-2"><Button className="btn-primary" onClick={()=>void ask()} disabled={loading||!question.trim()}>{loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"/>Consulting</>:<><Zap size={16}/>Ask Guide</>}</Button>{loading&&<Button onClick={()=>controller.current?.abort()}>Stop</Button>}<span aria-hidden className="muted inline-flex items-center gap-1 self-center font-mono text-[10px] uppercase tracking-wider">{(() => { const apple = /Mac|iPhone|iPad/.test(navigator.userAgent); return <><kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5">{apple ? '\u2318' : 'Ctrl'}</kbd>+<kbd className="rounded-md border border-white/15 bg-white/5 px-1.5 py-0.5">\u21b5</kbd></>; })()}</span></div>{!loading&&!answer&&<div className="mt-3 flex flex-wrap gap-2">{SUGGESTIONS.map(s=><button key={s} type="button" onClick={()=>void askSuggestion(s)} className="btn !min-h-9 !px-3 border-white/10 bg-white/[.03] font-mono text-[10px] normal-case tracking-normal text-ink/70 hover:border-violet-300/40 hover:text-ink">{s}</button>)}</div>}{loading&&<div role="status" aria-label="Guide is thinking" className="mt-5 space-y-2.5 rounded-2xl border border-violet-300/15 bg-violet-300/5 p-5"><div className="h-3 w-[85%] animate-pulse rounded bg-white/10"/><div className="h-3 w-full animate-pulse rounded bg-white/10 [animation-delay:120ms]"/><div className="h-3 w-[70%] animate-pulse rounded bg-white/10 [animation-delay:240ms]"/></div>}<span className="sr-only" role="status">{copied ? 'Answer copied to clipboard' : ''}</span>{answer&&<motion.div role="status" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:.35,ease:'easeOut'}} className="relative mt-6 whitespace-pre-wrap rounded-2xl border border-white/10 bg-black/25 p-5 pr-12 text-sm leading-7 text-white/90">{answer}
      <button type="button" aria-label="Copy answer" onClick={async()=>{if(await copyToClipboard(answer)){setCopied(true);setTimeout(()=>setCopied(false),1600);}}} className="icon-btn !h-9 !w-9 absolute right-2 top-2 rounded-xl text-white/60 hover:text-white">{copied?<Check size={15}/>:<Copy size={15}/>}</button>
    </motion.div>}</div></div></Panel>;
}
