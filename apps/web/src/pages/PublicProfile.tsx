import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Armchair, ArrowUpRight, Box, Check, ChevronDown, CircuitBoard, Cpu, Fan, Gamepad2, HardDrive, Headphones, Keyboard, MapPin, Medal, MemoryStick, Mic, Monitor, Mouse, Search, Share2, SlidersHorizontal, Speaker, Webcam, Zap } from 'lucide-react';
import { api, ApiError, isDemoMode } from '../lib/api';
import { igdbWideMobileVariant } from '../lib/image';
import { GameDetail } from './profile/GameDetail';
import { Stars } from './profile/Stars';
import { useMastheadCinema } from './profile/use-masthead-cinema';
import { Guide } from './profile/Guide';
import { ArchiveShortcuts } from './profile/Shortcuts';
import { LinkChips, LinksSection } from './profile/Links';
import type { Game, GameStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '../types';
import { Button, CoverImage, Panel, SectionHead, useToast } from '../components/ui';
import { GameCard, GalleryWall, MotionSection, Reveal, TickerStrip, TiltCard } from './profile/exhibits';
function LoadingProfile() { return <div className="container-shell py-24" role="status"><div className="skeleton h-8 w-40 rounded-xl"/><div className="skeleton mt-8 h-64 rounded-[30px]"/><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-80 rounded-3xl"/>)}</div><span className="sr-only">Loading player archive</span></div>; }

/** Component categories arrive free-form from the API, so match on keywords
 *  rather than an exhaustive map and fall back to a neutral crate icon. */
const RIG_ICONS: Array<[RegExp, typeof Cpu]> = [
  [/CPU|PROCESSOR/, Cpu], [/GPU|GRAPHIC/, CircuitBoard], [/MEMORY|RAM/, MemoryStick],
  [/STORAGE|DRIVE|SSD|NVME/, HardDrive], [/DISPLAY|MONITOR|SCREEN/, Monitor],
  [/KEYBOARD/, Keyboard], [/MOUSE/, Mouse], [/AUDIO|HEADSET|HEADPHONE/, Headphones],
  [/SPEAKER/, Speaker], [/MIC/, Mic], [/CAM/, Webcam], [/CHAIR|DESK/, Armchair],
  [/COOLING|FAN/, Fan], [/POWER|PSU/, Zap], [/MOTHERBOARD|SYSTEM|CASE|OS/, CircuitBoard],
];
function RigIcon({ category }: { category: string }) {
  const key = category.toUpperCase();
  const Icon = RIG_ICONS.find(([pattern]) => pattern.test(key))?.[1] ?? Box;
  return <Icon size={20} aria-hidden />;
}

/** Memoized row: typing in the search box re-renders only what changed. */
const ChronicleRow = memo(function ChronicleRow({ game: g, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[g.status];
  return (
    <motion.button
      layout key={g.id} onClick={()=>onOpen(g)}
      aria-label={`Open ${g.title} details (${STATUS_LABELS[g.status]})`} aria-haspopup="dialog"
      whileTap={{scale:.985}}
      className="group relative grid min-h-24 grid-cols-[56px_1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-ink/10 p-3 pl-4 text-left transition duration-300 hover:border-ink/25 hover:bg-ink/[.04] sm:grid-cols-[60px_minmax(0,1.5fr)_minmax(0,1fr)_auto] sm:gap-5"
    >
      <span aria-hidden className="absolute inset-y-0 left-0 w-1 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent)`, opacity:.7 }} />
      {/* Box art, not the banner: a 3:4 crop is what a shelf row wants. */}
      <CoverImage src={g.cover || g.banner || ''} alt="" className="aspect-[3/4] w-full rounded-lg border border-ink/10 transition duration-500 group-hover:border-ink/25"/>
      <div className="min-w-0">
        <h3 className="truncate font-semibold leading-tight">{g.title}</h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5" style={{color:tone.core}}>
            <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{background:tone.core}}/>{STATUS_LABELS[g.status]}
          </span>
          <span className="text-ink/45">·</span><span className="text-ink/65">{g.platform}</span>
          {g.year!=null&&<><span className="text-ink/45">·</span><span className="text-ink/65">{g.year}</span></>}
        </p>
      </div>
      <p title={g.genres.join(' · ')} className="muted hidden min-w-0 truncate text-sm sm:block">{g.genres.join(' · ')}</p>
      <div className="flex items-center gap-3 pr-1 text-right">
        <div><Stars value={g.rating} /><p className="muted mt-1 font-mono text-[10px] uppercase tracking-wider">{g.hours ?? 0} hrs</p></div>
        <ArrowUpRight size={16} className="shrink-0 text-cyan-200 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-within:opacity-100"/>
      </div>
    </motion.button>
  );
});

/** Long archives deserve quick actions; both appear past the masthead. */
function FloatingActions({ onShare }: { onShare?: () => void }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // If a control here holds focus while hiding, hand focus back cleanly.
  useEffect(() => {
    if (visible) return;
    const active = document.activeElement;
    if (wrapRef.current && active instanceof HTMLElement && wrapRef.current.contains(active)) active.blur();
  }, [visible]);
  return <AnimatePresence>{visible && (
    <div ref={wrapRef} className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-3">
    {onShare && (
      <motion.button
        type="button" aria-label="Share this archive"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
        transition={{ duration: reduce ? 0 : .25 }}
        onClick={onShare}
        className="glass icon-btn rounded-full text-cyan-200"
      ><Share2 size={18} /></motion.button>
    )}
    <motion.button
      type="button" aria-label="Back to top"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
      transition={{ duration: reduce ? 0 : .25 }}
      onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
      className="glass icon-btn rounded-full"
    ><ChevronDown size={19} className="rotate-180" /></motion.button>
    </div>
  )}</AnimatePresence>;
}


export default function PublicProfile() {
  const [copied,setCopied]=useState(false); const toast=useToast();
  const searchRef=useRef<HTMLInputElement>(null);
  const mastheadRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const { handle='nova' }=useParams(); const [params]=useSearchParams(); const navigate=useNavigate(); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('Newest'); const [search,setSearch]=useState(''); const deferredSearch=useDeferredValue(search);
  const query=useQuery({queryKey:['public-profile',handle],queryFn:({signal})=>api.publicProfile(handle,signal),
    // Studio edits invalidate this key, so a long fresh window is safe here
    // and makes repeat visits to the same archive instant.
    staleTime:5*60_000,retry:(count,e)=>!(e instanceof ApiError&&e.status===404)&&count<2});
  useMastheadCinema(mastheadRef, statsRef, !query.isPending && !query.isError);
  // Hash targets (#guide, #rig…) only exist once data renders; retry the anchor jump then.
  useEffect(()=>{ if(query.isPending||!window.location.hash) return; const el=document.getElementById(window.location.hash.slice(1)); el?.scrollIntoView(); },[query.isPending,query.data]);
  const games=useMemo(()=>{const list=(query.data?.games??[]).filter(g=>(filter==='all'||g.status===filter)&&g.title.toLowerCase().includes(deferredSearch.toLowerCase()));return [...list].sort((a,b)=>sort==='Rating'?((b.rating??0)-(a.rating??0)):sort==='Title'?a.title.localeCompare(b.title):((b.year??0)-(a.year??0)))},[query.data,filter,sort,deferredSearch]);
  const selected=query.data?.games.find(g=>g.slug===params.get('game'));
  // Stable identities so memoized exhibit cards skip re-render while filters/search type.
  const open=useCallback((g:Game)=>navigate({search:`?game=${g.slug}`},{replace:false}),[navigate]);
  const close=useCallback(()=>navigate({search:''},{replace:true}),[navigate]);
  // Gallery-style browsing: step through the curated collection with wrap-around.
  const stepGame=useCallback((delta:number)=>{
    const doc=query.data; if(!doc||!selected)return;
    const total=doc.games.length; const idx=doc.games.findIndex(g=>g.id===selected.id);
    open(doc.games[(idx+delta+total)%total]);
  },[query.data,selected,open]);
  // Neighbour titles turn the dossier's stepper into a signposted walk.
  const neighbours=useMemo(()=>{
    const list=query.data?.games??[]; const index=selected?list.findIndex(g=>g.id===selected.id):-1;
    if(index<0||list.length<2) return {index:Math.max(index,0),prev:undefined,next:undefined};
    return {index,prev:list[(index-1+list.length)%list.length].title,next:list[(index+1)%list.length].title};
  },[query.data,selected]);
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
  <section className="container-shell pt-6 sm:pt-10">
    <Panel elemRef={mastheadRef} className="relative isolate min-h-[560px] overflow-hidden bg-[#0b0f1c] sm:min-h-[620px]">
      <div data-banner-parallax className="absolute -inset-y-8 inset-x-0"><CoverImage src={p.banner} alt="" data-banner-zoom priority mobileSrc={igdbWideMobileVariant(p.banner)} className="absolute inset-0 opacity-60"/></div>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/80 to-[#070a14]/10"/>
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-[#070a14] via-transparent to-[#070a14]/50"/>
      {/* Three bands — identity, headline, ledger — so nothing collides at any height. */}
      <div className="relative flex min-h-[560px] flex-col justify-between gap-10 p-6 sm:min-h-[620px] sm:gap-14 sm:p-12">
        <div>
          <div className="flex items-center gap-4">
            {p.avatar
              ? <CoverImage src={p.avatar} alt={`${p.displayName} avatar`} priority className="h-16 w-16 shrink-0 rounded-2xl border border-white/20"/>
              : <div aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/20 bg-white/5 font-mono text-lg text-cyan-200">{p.displayName.slice(0,1).toUpperCase()}</div>}
            <div>
              <span className="font-mono text-xs tracking-wide text-cyan-200">@{p.handle}</span>
              {p.location
                ? <p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14}/>{p.location}</p>
                : null}
            </div>
          </div>
          <LinkChips links={p.links}/>
        </div>
        <div className="max-w-3xl">
          <div data-cinema className="eyebrow cinema-hidden">Player archive · est. {p.since}</div>
          <h1 data-cinema className="cinema-hidden mt-4 text-balance text-[clamp(2.75rem,10vw,8rem)] font-bold leading-[.88] tracking-[-.07em] text-white">{p.displayName}</h1>
          <p data-cinema className="cinema-hidden mt-6 max-w-xl text-lg leading-8 text-white/75">{p.bio}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            {p.links.length > 0 && <a href="#links" className="btn btn-primary">Open links <ChevronDown size={17}/></a>}
            <a href="#featured" className={p.links.length ? 'btn' : 'btn btn-primary'}>Enter the collection <ChevronDown size={17}/></a>
            <Button type="button" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={shareProfile}>{copied ? <Check size={17}/> : <Share2 size={17}/>}{copied ? 'Link copied' : 'Share archive'}</Button>
          </div>
        </div>
        <div ref={statsRef} data-cinema className="cinema-hidden grid w-full max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
          {([[p.games.length,'GAMES'],[Math.round(p.games.reduce((n,g)=>n+(g.hours??0),0)),'HOURS LOGGED'],[p.games.filter(x=>x.award).length,'AWARDS']] as Array<[number,string]>).map(([value,label]) => (
            <div key={label} className="bg-white/[.04] px-4 py-4 backdrop-blur-sm sm:px-6 sm:py-5">
              <div className="font-mono text-[10px] uppercase tracking-[.2em] text-cyan-200/90">{label}</div>
              <div className="mt-1.5 text-3xl font-bold leading-none tracking-tight text-white sm:text-4xl"><span data-count={value}>{value.toLocaleString('en-US')}</span></div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  </section>
  <LinksSection links={p.links}/>
  <MotionSection id="rig" className="section cv-auto container-shell" watermark="THE RIG"><SectionHead kicker="01 · Battle station" title={<>The <span className="text-gradient">Rig</span></>} body="A deliberately tuned system. Every component documented like an artifact."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{p.rig.map((r,i)=>
    <Reveal key={r.id} delay={(i%4)*0.06}><TiltCard><Panel className="group relative h-full overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/25">
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-cyan-300/[.07] opacity-0 blur-2xl transition duration-500 group-hover:opacity-100"/>
      <div className="relative flex items-start justify-between">
        <span className="grid h-11 w-11 place-items-center rounded-xl border border-ink/10 bg-ink/[.04] text-cyan-300 transition group-hover:border-cyan-300/40"><RigIcon category={r.category}/></span>
        <span className="font-mono text-[9px] tracking-[.2em] text-ink/40">{String(i+1).padStart(2,'0')}</span>
      </div>
      <span className="label relative mt-8">{r.category}</span>
      <h3 className="relative text-lg font-semibold leading-snug tracking-tight">{r.name}</h3>
      {r.detail && <p className="muted relative mt-2 font-mono text-xs leading-5">{r.detail}</p>}
    </Panel></TiltCard></Reveal>)}</div>
  {!p.rig.length && <div className="glass rounded-[22px] p-10 text-center"><Cpu className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">The battle station is undocumented</h3><p className="muted mt-2">This curator has not filed their hardware yet.</p></div>}</MotionSection>
  {featured.length>0 && <TickerStrip games={featured}/>}
  <section id="featured" className="relative section container-shell"><span aria-hidden className="watermark">HALL OF FAME</span><SectionHead kicker="02 · Hall of fame" title={<>The games that <span className="text-gradient">stayed</span></>} body="Inductees hang as posters along the gallery wall. Scroll and the wall walks with you; open any frame for its complete dossier."/><div className="grid grid-cols-2 gap-3 sm:hidden">{featured.map((g,i)=><Reveal key={g.id} delay={(i%2)*0.07}><GameCard game={g} onOpen={open}/></Reveal>)}</div>
  <GalleryWall games={featured} onOpen={open}/>
  {!featured.length && <div className="glass rounded-[22px] p-10 text-center"><Medal className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">No inductees yet</h3><p className="muted mt-2">The shelf awaits its first permanent resident.</p></div>}</section>
  <MotionSection id="chronicle" className="section cv-auto container-shell" watermark="THE CHRONICLE"><SectionHead kicker="03 · Chronicle" title="Every save tells a story." body="The complete play history, arranged as a living catalog." action={<div className="flex gap-2"><span aria-live="polite" role="status" className="btn"><SlidersHorizontal size={15}/>{games.length} entries</span></div>}/><Panel className="p-4 sm:p-6"><div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="relative"><span className="sr-only">Search games</span><Search className="absolute left-3 top-3.5 text-ink/40" size={17}/><input ref={searchRef} id="chronicle-search" className="field pl-10" placeholder="Search the chronicle" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="field min-w-40" aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}>{(['all',...STATUS_ORDER] as Array<'all'|GameStatus>).map(x=><option key={x} value={x}>{x==='all'?'All':STATUS_LABELS[x]}</option>)}</select><select className="field min-w-40" aria-label="Sort games" value={sort} onChange={e=>setSort(e.target.value)}><option>Newest</option><option>Rating</option><option>Title</option></select></div><motion.div layout className="grid gap-3">{games.map(g=><ChronicleRow key={g.id} game={g} onOpen={open}/>)}{!games.length&&<div className="py-16 text-center"><Gamepad2 className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl">No saves found</h3><p className="muted mt-2">Change the filter or search phrase.</p></div>}</motion.div></Panel></MotionSection>
  <MotionSection id="guide" className="no-print section cv-auto container-shell"><SectionHead kicker="04 · AI Guide" title={<>A compass for your <span className="text-gradient">next world</span>.</>} body="Questions answered from this portfolio, never from the wider internet."/><Guide handle={p.handle}/></MotionSection>
  <AnimatePresence>{selected&&<GameDetail game={selected} close={close} onStep={stepGame} showStepper={p.games.length>1} position={neighbours.index} total={p.games.length} prevTitle={neighbours.prev} nextTitle={neighbours.next}/>}</AnimatePresence>
  <FloatingActions onShare={shareProfile}/>
  <ArchiveShortcuts onSearch={()=>{document.getElementById('chronicle')?.scrollIntoView();searchRef.current?.focus();}}/></>;
}
