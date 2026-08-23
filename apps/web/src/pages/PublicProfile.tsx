import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import gsap from 'gsap';
import { ArrowUpRight, Bot, Check, ChevronDown, Cpu, Gamepad2, MapPin, Medal, Search, Share2, SlidersHorizontal, Sparkles, Star, X, Zap } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Game } from '../types';
import { STATUS_COLORS, STATUS_LABELS } from '../types';
import { formatDate } from '../lib/utils';
import { Button, CoverImage, Panel, SectionHead, StatusPill } from '../components/ui';

const MotionSection = ({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) => { const reduce = useReducedMotion(); return <motion.section id={id} className={className} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .55 }}>{children}</motion.section>; };

function LoadingProfile() { return <div className="container-shell py-24" role="status"><div className="skeleton h-8 w-40 rounded-xl"/><div className="skeleton mt-8 h-64 rounded-[30px]"/><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-80 rounded-3xl"/>)}</div><span className="sr-only">Loading player archive</span></div>; }

function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="font-mono text-[10px] uppercase tracking-wider text-white/55">Unrated</span>;
  return <span className="flex items-center gap-0.5" aria-label={`Rated ${value} out of 5`}>{[1,2,3,4,5].map(n => (
    <Star key={n} size={12} aria-hidden className={n <= Math.round(value) ? 'text-amber-300' : 'text-white/25'} fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
  ))}</span>;
}

function GameCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button layout onClick={onOpen} aria-label={`Open ${game.title} details`}
      className={`card-sheen card-glow group relative aspect-[4/4.6] min-h-64 overflow-hidden rounded-[24px] border text-left shadow-card transition-colors ${game.featured ? 'holo-ring border-transparent' : 'border-white/15'}`}
      whileHover={{ y: -8 }} transition={{ type:'spring', stiffness:260, damping:22 }}>
      <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070f] via-[#05070f]/35 to-black/10" />
      <motion.div style={{ backgroundImage: `linear-gradient(160deg, ${tone.core}26, transparent 45%)` }} className="absolute inset-0 opacity-70" />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
        {game.banner ? <CoverImage src={game.cover} alt="" className="h-14 w-10 rounded-lg border border-white/25 shadow-lg" /> : <StatusPill>{game.platform}</StatusPill>}
        {game.award && <span className="grid h-9 w-9 place-items-center rounded-full border border-amber-200/40 bg-black/55 text-amber-200 shadow-glow-amber" title={game.award}><Medal size={17} /></span>}
      </div>
      {game.featured && <span className="absolute right-3 top-14 hidden font-mono text-[9px] uppercase tracking-[.28em] text-cyan-200/90 [writing-mode:vertical-rl] sm:block">Hall of fame</span>}
      <div className="absolute inset-x-0 bottom-0 p-4 text-white">
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
    </motion.button>
  );
}

function GameDetail({ game, close }: { game: Game; close: () => void }) {
  const panel = useRef<HTMLDivElement>(null); const reduce = useReducedMotion();
  useEffect(() => { if (!panel.current || reduce) return; const ctx = gsap.context(() => { gsap.fromTo(panel.current, { rotationY: -92, transformPerspective: 1400, opacity: .4 }, { rotationY: 0, opacity: 1, duration: .72, ease: 'power3.out' }); }, panel); return () => ctx.revert(); }, [game.id, reduce]);
  useEffect(() => { const previous = document.activeElement as HTMLElement; const handler=(e:KeyboardEvent)=>{if(e.key==='Escape')close()}; addEventListener('keydown',handler); return()=>{removeEventListener('keydown',handler);previous?.focus()}; }, [close]);
  const tone = STATUS_COLORS[game.status];
  const accession = `SP-${game.year ?? '????'}-${game.id.replaceAll('-','').slice(0,6).toUpperCase()}`;
  return (
    <motion.div className="fixed inset-0 z-[80] overflow-y-auto bg-[#03050b]/88 p-3 backdrop-blur-xl sm:p-7" role="dialog" aria-modal="true" aria-labelledby="game-title" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={e => { if(e.target===e.currentTarget) close(); }}>
      <div ref={panel} className="glass relative mx-auto max-w-5xl overflow-hidden rounded-[28px]">
        <div className="relative">
          <CoverImage src={game.banner || game.cover} alt="" className="aspect-[21/9] max-h-[340px] w-full sm:aspect-[21/7]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e] via-[#0a0f1e]/40 to-transparent" />
          <Button className="icon-btn absolute right-4 top-4 z-10 bg-black/55 text-white" onClick={close} aria-label="Close game details" autoFocus><X size={20}/></Button>
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-9">
            <div className="eyebrow">Accession {accession}</div>
            <h2 id="game-title" className="mt-3 max-w-3xl text-3xl font-bold leading-[.95] tracking-[-.04em] text-white sm:text-6xl">{game.title}</h2>
          </div>
        </div>
        <div className="grid gap-8 p-5 sm:p-9 lg:grid-cols-[1.15fr_.85fr] lg:gap-10">
          <div>
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
          </div>
          <aside className="rounded-[22px] border border-white/10 bg-black/25 p-5 backdrop-blur-sm sm:p-6">
            <div className="eyebrow">Archive record</div>
            {game.cover && !game.banner && <CoverImage src={game.cover} alt="" className="mt-4 aspect-[3/4] w-32 rounded-xl border border-white/15" />}
            <p className="mt-4 text-sm leading-7 text-white/80">{game.summary || 'Official record pending first IGDB snapshot.'}</p>
            {!!game.genres.length && <div className="mt-5 flex flex-wrap gap-1.5">{game.genres.map(g => <StatusPill key={g}>{g}</StatusPill>)}</div>}
            {!!game.platforms.length && <p className="muted mt-4 font-mono text-[11px] leading-5">ALSO ON · {game.platforms.join(' · ')}</p>}
            <p className="muted mt-6 border-t border-white/10 pt-4 font-mono text-[10px] leading-5">METADATA SNAPSHOT VIA IGDB · CAPTURED WHEN THIS ENTRY WAS FILED</p>
          </aside>
        </div>
      </div>
    </motion.div>);
}

function Guide({ handle }: { handle: string }) {
  const [question,setQuestion]=useState('What should I play next based on this archive?'); const [answer,setAnswer]=useState(''); const [loading,setLoading]=useState(false); const controller=useRef<AbortController>();
  const ask=async()=>{controller.current?.abort(); controller.current=new AbortController(); setLoading(true);setAnswer(''); try{const r=await api.guide(handle,question,controller.current.signal);setAnswer(r.answer)}catch(e){if((e as Error).name!=='AbortError')setAnswer('The Guide lost its signal. Try again in a moment.')}finally{setLoading(false)}};
  return <Panel className="relative overflow-hidden p-5 sm:p-8"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/15 blur-3xl"/><div className="relative grid gap-7 lg:grid-cols-[.7fr_1.3fr]"><div><div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/30 bg-violet-300/10 text-violet-300"><Bot/></div><h3 className="mt-5 text-2xl font-semibold">Ask the archive</h3><p className="muted mt-2 leading-7">A profile-scoped guide grounded only in this curator’s games, ratings, and field notes.</p><span className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-violet-300"><Sparkles size={13}/> Generated guidance</span></div><div><label className="label" htmlFor="guide-question">YOUR QUESTION</label><textarea id="guide-question" className="field" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={300}/><div className="mt-3 flex flex-wrap gap-2"><Button className="btn-primary" onClick={ask} disabled={loading||!question.trim()}>{loading?<><span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black"/>Consulting</>:<><Zap size={16}/>Ask Guide</>}</Button>{loading&&<Button onClick={()=>controller.current?.abort()}>Stop</Button>}</div>{answer&&<motion.div role="status" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/5 p-5 leading-7">{answer.replaceAll('**','')}<div className="muted mt-4 border-t border-white/10 pt-3 font-mono text-[10px]">SOURCES · THIS PROFILE ONLY</div></motion.div>}</div></div></Panel>;
}

export default function PublicProfile() {
  const [copied,setCopied]=useState(false);
  const { handle='nova' }=useParams(); const [params]=useSearchParams(); const navigate=useNavigate(); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('Newest'); const [search,setSearch]=useState('');
  const query=useQuery({queryKey:['public-profile',handle],queryFn:({signal})=>api.publicProfile(handle,signal),retry:(count,e)=>!(e instanceof ApiError&&e.status===404)&&count<2});
  const games=useMemo(()=>{const list=(query.data?.games??[]).filter(g=>(filter==='all'||g.status===filter)&&g.title.toLowerCase().includes(search.toLowerCase()));return [...list].sort((a,b)=>sort==='Rating'?((b.rating??0)-(a.rating??0)):((b.year??0)-(a.year??0)))},[query.data,filter,sort,search]);
  const selected=query.data?.games.find(g=>g.slug===params.get('game')); const open=(g:Game)=>navigate({search:`?game=${g.slug}`},{replace:false}); const close=()=>navigate({search:''},{replace:true});
  if(query.isPending)return <LoadingProfile/>; if(query.isError){const notFound=query.error instanceof ApiError&&query.error.status===404;return <div className="container-shell grid min-h-[65vh] place-items-center text-center"><div><div className="eyebrow justify-center">{notFound?'404 · Uncharted player':'Signal interrupted'}</div><h1 className="mt-5 text-5xl font-bold">{notFound?'This archive is sealed.':'Could not reach the archive.'}</h1><p className="muted mt-4">{notFound?'Check the handle and try another route.':'Your connection may have drifted. Retry when ready.'}</p><Button className="mt-7" onClick={()=>query.refetch()}>{notFound?'Try demo archive':'Retry'}</Button></div></div>};
  const p=query.data; const featured=p.featuredOrder.map(id=>p.games.find(g=>g.id===id)).filter(Boolean) as Game[];
  const shareProfile=async()=>{const url=`${location.origin}/u/${p.handle}`;try{ if(navigator.share){await navigator.share({title:`${p.displayName} on SavePoint`,text:`${p.displayName}'s gaming archive`,url});}else{await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800);} }catch{/* dismissed */} };
  return <><Helmet><title>{p.displayName} (@{p.handle}), SavePoint</title><meta name="description" content={p.bio}/><link rel="canonical" href={`${location.origin}/u/${p.handle}`}/><meta property="og:type" content="profile"/><meta property="og:title" content={`${p.displayName} (@${p.handle}), SavePoint`}/><meta property="og:description" content={p.bio}/><meta property="og:url" content={`${location.origin}/u/${p.handle}`}/>{p.banner && <meta property="og:image" content={p.banner}/>}{p.banner && <meta property="og:image:alt" content={`${p.displayName}'s SavePoint portfolio`}/>}<meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta name="twitter:card" content="summary_large_image"/></Helmet>
  <section className="container-shell pt-6 sm:pt-10"><Panel className="relative min-h-[560px] overflow-hidden bg-[#0b0f1c]"><CoverImage src={p.banner} alt="" className="absolute inset-0 opacity-50"/><div className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/75 to-transparent"/><div className="relative flex min-h-[560px] max-w-3xl flex-col justify-end p-6 sm:p-12"><div className="mb-auto flex items-center gap-4"><CoverImage src={p.avatar} alt={`${p.displayName} avatar`} className="h-16 w-16 rounded-2xl border border-white/20"/><div><span className="font-mono text-xs text-cyan-200">@{p.handle}</span><p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14}/>{p.location}</p></div></div><div className="eyebrow">Player archive · est. {p.since}</div><h1 className="mt-4 text-[clamp(2.55rem,10vw,8rem)] font-bold leading-[.9] tracking-[-.065em] text-white">{p.displayName}</h1><p className="mt-6 max-w-xl text-lg leading-8 text-white/75">{p.bio}</p><div className="mt-8 flex flex-wrap gap-3"><a href="#featured" className="btn btn-primary">Enter the collection <ChevronDown size={17}/></a><Button type="button" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={shareProfile}>{copied ? <Check size={17}/> : <Share2 size={17}/>}{copied ? 'Link copied' : 'Share archive'}</Button><span className="flex min-h-11 items-center px-3 font-mono text-xs text-white/60">{p.games.length} GAMES · {Math.round(p.games.reduce((n,g)=>n+(g.hours??0),0))} HOURS</span></div></div></Panel></section>
  <MotionSection id="rig" className="section container-shell"><SectionHead kicker="01 · Battle station" title={<>The <span className="text-gradient">Rig</span></>} body="A deliberately tuned system. Every component documented like an artifact."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{p.rig.map((r,i)=><Panel key={r.id} className="group p-5 transition hover:-translate-y-1"><div className="flex justify-between"><Cpu size={20} className={i%2?'text-violet-300':'text-cyan-300'}/><span className="font-mono text-[9px] text-ink/40">0{i+1}</span></div><span className="label mt-10">{r.category}</span><h3 className="text-lg font-semibold">{r.name}</h3><p className="muted mt-2 font-mono text-xs leading-5">{r.detail}</p></Panel>)}</div></MotionSection>
  <MotionSection id="featured" className="section container-shell"><SectionHead kicker="02 · Hall of fame" title={<>The games that <span className="text-gradient">stayed</span></>} body="The permanent collection. Open a card to turn it over and read the complete field notes."/><div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{featured.map(g=><GameCard key={g.id} game={g} onOpen={()=>open(g)}/>)}</div></MotionSection>
  <MotionSection id="chronicle" className="section container-shell"><SectionHead kicker="03 · Chronicle" title="Every save tells a story." body="The complete play history, arranged as a living catalog." action={<div className="flex gap-2"><span className="btn"><SlidersHorizontal size={15}/>{games.length} entries</span></div>}/><Panel className="p-4 sm:p-6"><div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="relative"><span className="sr-only">Search games</span><Search className="absolute left-3 top-3.5 text-ink/40" size={17}/><input className="field pl-10" placeholder="Search the chronicle" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="field min-w-40" aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','playing','completed','backlog','dropped'].map(x=><option key={x} value={x}>{x==='all'?'All':STATUS_LABELS[x as keyof typeof STATUS_LABELS]}</option>)}</select><select className="field min-w-40" aria-label="Sort games" value={sort} onChange={e=>setSort(e.target.value)}><option>Newest</option><option>Rating</option></select></div><motion.div layout className="grid gap-3">{games.map(g=><motion.button layout key={g.id} onClick={()=>open(g)} aria-label={`Open ${g.title} details`} className="group relative grid min-h-24 grid-cols-[64px_1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-3 pl-4 text-left transition hover:border-white/25 hover:bg-white/5 sm:grid-cols-[72px_1fr_1fr_auto]">
<span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${STATUS_COLORS[g.status].core}, transparent)`, opacity:.85 }} />
<CoverImage src={g.banner || g.cover} alt="" className="h-20 rounded-xl"/><div><h3 className="font-semibold">{g.title}</h3><p className="muted mt-1 font-mono text-[10px]"><span style={{color:STATUS_COLORS[g.status].core}}>{STATUS_LABELS[g.status]}</span> · {g.platform} · {g.year}</p></div><p className="muted hidden truncate text-sm sm:block">{g.genres.join(' · ')}</p><div className="flex items-center gap-3 text-right"><div><Stars value={g.rating} /><p className="muted mt-1 text-xs">{g.hours ?? 0} hrs</p></div><ArrowUpRight size={16} className="text-cyan-200 opacity-0 transition group-hover:opacity-100"/></div></motion.button>)}{!games.length&&<div className="py-16 text-center"><Gamepad2 className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl">No saves found</h3><p className="muted mt-2">Change the filter or search phrase.</p></div>}</motion.div></Panel></MotionSection>
  <MotionSection id="guide" className="section container-shell"><SectionHead kicker="04 · AI Guide" title={<>A compass for your <span className="text-gradient">next world</span>.</>} body="Questions answered from this portfolio, never from the wider internet."/><Guide handle={p.handle}/></MotionSection>
  <AnimatePresence>{selected&&<GameDetail game={selected} close={close}/>}</AnimatePresence></>;
}
