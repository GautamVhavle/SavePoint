import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx as cn } from 'clsx';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { ArrowUpRight, Check, ChevronDown, Cpu, Gamepad2, MapPin, Medal, Search, Share2, SlidersHorizontal, Star } from 'lucide-react';
import { api, ApiError, isDemoMode } from '../lib/api';
import { igdbWideMobileVariant } from '../lib/image';
import { GameDetail } from './profile/GameDetail';
import { Stars } from './profile/Stars';
import { useMastheadCinema } from './profile/use-masthead-cinema';
import { Guide } from './profile/Guide';
import type { Game, GameStatus } from '../types';
import { STATUS_COLORS, STATUS_LABELS, STATUS_ORDER } from '../types';
import { Button, CoverImage, Panel, SectionHead, useToast } from '../components/ui';

const MotionSection = ({ children, className = '', id, watermark }: { children: React.ReactNode; className?: string; id?: string; watermark?: string }) => { const reduce = useReducedMotion(); return <motion.section id={id} className={cn('relative', className)} initial={reduce ? false : { opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: .55 }}>{watermark && <span aria-hidden className="watermark">{watermark}</span>}{children}</motion.section>; };

function LoadingProfile() { return <div className="container-shell py-24" role="status"><div className="skeleton h-8 w-40 rounded-xl"/><div className="skeleton mt-8 h-64 rounded-[30px]"/><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">{[1,2,3,4].map(i=><div key={i} className="skeleton h-80 rounded-3xl"/>)}</div><span className="sr-only">Loading player archive</span></div>; }

function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay, ease: [.22, .61, .36, 1] }}
    >
      {children}
    </motion.div>
  );
}


const GameCard = memo(function GameCard({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      layout
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className={`card-sheen group relative aspect-[3/4] overflow-hidden rounded-[20px] border text-left shadow-card transition-colors sm:aspect-[4/4.6] sm:min-h-64 sm:rounded-[24px] ${game.featured ? 'holo-ring border-transparent' : 'border-white/15'}`}
      whileHover={{ y: -8 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      {/* Mobile: box art alone (display:none keeps it unfetched on desktop).
          Desktop: wide banner art under the full stat overlay. */}
      <CoverImage src={game.cover} alt={`${game.title} cover artwork`} className="absolute inset-0 transition duration-700 group-hover:scale-[1.05] sm:hidden" />
      <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 hidden sm:block" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070f]/85 via-transparent to-black/10 sm:from-[#05070f] sm:via-[#05070f]/30" />
      <motion.div aria-hidden style={{ backgroundImage: `linear-gradient(150deg, ${tone.soft}, transparent 46%)` }} className="absolute inset-0 opacity-80" />

      {/* Status spine reads at every size without stealing attention. */}
      <motion.span aria-hidden initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:.5,ease:"easeOut"}} className="absolute inset-y-0 left-0 w-[3px] origin-top" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 72%)` }} />
      {game.award && (
        <span className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full border border-amber-200/40 bg-black/55 text-amber-200 shadow-glow-amber sm:right-3 sm:top-3" title={game.award}>
          <Medal size={16} />
        </span>
      )}

      {game.featured && (
        <span className="absolute right-3 top-14 hidden font-mono text-[9px] uppercase tracking-[.28em] text-cyan-200/90 [writing-mode:vertical-rl] sm:block">
          Hall of fame
        </span>
      )}

      {/* Desktop-only overlay: title, stars, platform. */}
      <div className="absolute inset-x-0 bottom-0 hidden p-4 text-white sm:block">
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

      {/* Compact value chip survives on mobile art so worth is visible pre-tap. */}
      {game.rating != null && (
        <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/15 bg-black/55 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-200 backdrop-blur-sm sm:hidden">
          <Star size={10} fill="currentColor" />{game.rating.toFixed(1)}
        </span>
      )}
    </motion.button>
  );
});

/** Memoized row: typing in the search box re-renders only what changed. */
const ChronicleRow = memo(function ChronicleRow({ game: g, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  return (
    <motion.button layout key={g.id} onClick={()=>onOpen(g)} aria-label={`Open ${g.title} details (${STATUS_LABELS[g.status]})`} aria-haspopup="dialog" whileTap={{scale:.985}} className="group relative grid min-h-24 grid-cols-[64px_1fr_auto] items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-3 pl-4 text-left transition hover:border-white/25 hover:bg-white/5 sm:grid-cols-[72px_1fr_1fr_auto]">
<span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${STATUS_COLORS[g.status].core}, transparent)`, opacity:.85 }} />
<CoverImage src={g.banner || g.cover} alt="" className="h-20 rounded-xl"/><div><h3 className="font-semibold">{g.title}</h3><p className="muted mt-1 font-mono text-[10px]"><span style={{color:`var(--status-${g.status})`}}>{STATUS_LABELS[g.status]}</span> · {g.platform} · {g.year}</p></div><p className="muted hidden truncate text-sm sm:block">{g.genres.join(' · ')}</p><div className="flex items-center gap-3 text-right"><div><Stars value={g.rating} /><p className="muted mt-1 text-xs">{g.hours ?? 0} hrs</p></div><ArrowUpRight size={16} className="text-cyan-200 opacity-0 transition group-hover:opacity-100"/></div></motion.button>
  );
});

function TickerStrip({ games }: { games: Game[] }) {
  if (!games.length) return null;
  const items = games.map(g => g.rating == null
    ? g.title
    : `${g.title} ${'\u2605'.repeat(Math.max(1, Math.round(g.rating)))}`);
  const row = (hidden: boolean) => (
    <div aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {items.map((t, i) => (
        <span key={i} className="flex items-center gap-6 whitespace-nowrap px-6 py-3 font-mono text-[11px] uppercase tracking-[.24em] text-white/70">
          {t}<span className="text-white/45">{'\u25c6'}</span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="ticker relative z-10" role="presentation">
      <div className="sr-only">Featured games: {items.join(', ')}</div>
      <div className="ticker-track">{row(true)}{row(true)}</div>
    </div>
  );
}

/** Desktop-only: the first inductee gets the pedestal. */
const GrandExhibit = memo(function GrandExhibit({ game, onOpen }: { game: Game; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className="holo-ring group relative block w-full overflow-hidden rounded-[28px] text-left shadow-card"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: 'spring', stiffness: 240, damping: 24 }}
    >
      <div className="relative min-h-[380px] lg:min-h-[460px]">
        <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 transition duration-[1200ms] group-hover:scale-[1.04]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#04060d] via-[#04060d]/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#04060d]/80 via-transparent to-transparent" />
        <span aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 75%)` }} />
        {game.award && (
          <span className="absolute right-6 top-6 flex items-center gap-2 rounded-full border border-amber-200/40 bg-black/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[.2em] text-amber-200 backdrop-blur-sm">
            <Medal size={14} /> {game.award}
          </span>
        )}
        <span className="absolute left-7 top-7 hidden font-mono text-[10px] uppercase tracking-[.34em] text-white/70 [writing-mode:vertical-rl] lg:block">
          Grand exhibit · Nº 001
        </span>
        <div className="absolute inset-x-0 bottom-0 p-7 sm:p-10">
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.26em]" style={{ color: tone.core }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: tone.core, boxShadow: `0 0 10px ${tone.core}` }} />
            {STATUS_LABELS[game.status]} · Est. {game.year} · {game.hours} hrs logged
          </span>
          <h3 className="mt-3 max-w-4xl text-[clamp(2.2rem,5vw,4.5rem)] font-bold leading-[.92] tracking-[-.05em] text-white">{game.title}</h3>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Stars value={game.rating} />
            <span className="rounded-full border border-white/15 bg-black/40 px-3 py-1 font-mono text-[11px] text-white/85">{game.platform}</span>
            {game.featuredNote && <p className="hidden max-w-md text-sm italic leading-6 text-white/70 lg:block">“{game.featuredNote}”</p>}
            <span className="ml-auto hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[.22em] text-cyan-200 opacity-0 transition duration-300 group-hover:opacity-100 sm:flex">
              Open the dossier <ArrowUpRight size={16} />
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
});

/** Desktop-only plaque: art above, engraved nameplate below. */
const HallPlaque = memo(function HallPlaque({ game, index, onOpen }: { game: Game; index: number; onOpen: (game: Game) => void }) {
  const tone = STATUS_COLORS[game.status];
  return (
    <motion.button
      onClick={() => onOpen(game)}
      aria-label={`Open ${game.title} details (${STATUS_LABELS[game.status]})`} aria-haspopup="dialog"
      className="card-sheen group relative overflow-hidden rounded-[24px] border border-white/10 bg-panel text-left shadow-card transition-colors hover:border-cyan-300/30"
      whileHover={{ y: -6 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <CoverImage src={game.banner || game.cover} alt="" className="absolute inset-0 transition duration-700 group-hover:scale-[1.06]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <motion.span aria-hidden initial={{scaleY:0}} whileInView={{scaleY:1}} viewport={{once:true}} transition={{duration:.5,ease:"easeOut"}} className="absolute inset-y-0 left-0 w-[3px] origin-top" style={{ background: `linear-gradient(180deg, ${tone.core}, transparent 70%)` }} />
        {game.award && (
          <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full border border-amber-200/40 bg-black/55 text-amber-200" title={game.award}>
            <Medal size={14} />
          </span>
        )}
        <span className="absolute bottom-3 left-4 font-mono text-[9px] uppercase tracking-[.26em]" style={{ color: tone.core }}>
          Induction Nº {String(index + 1).padStart(3, '0')}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/30 px-4 py-3.5 backdrop-blur-sm">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{game.title}</h3>
          <p className="muted mt-0.5 font-mono text-[10px] uppercase tracking-wider">{STATUS_LABELS[game.status]} · {game.year}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Stars value={game.rating} />
          <span className="rounded-full border border-white/12 bg-black/35 px-2 py-0.5 font-mono text-[10px] text-white/75">{game.platform}</span>
        </div>
      </div>
    </motion.button>
  );
});

function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0); const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 180, damping: 18 }); const sry = useSpring(ry, { stiffness: 180, damping: 18 });
  const reduce = useReducedMotion();
  if (reduce) return <div>{children}</div>;
  return (
    <motion.div
      ref={ref}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(e) => { if (e.pointerType !== 'mouse' || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ry.set(((e.clientX - r.left) / r.width - .5) * 7);
        rx.set(-((e.clientY - r.top) / r.height - .5) * 7); }}
      onPointerLeave={() => { rx.set(0); ry.set(0); }}
    >{children}</motion.div>
  );
}

/** Long archives deserve a quick way home; appears past the masthead. */
function BackToTop() {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <AnimatePresence>{visible && (
    <motion.button
      type="button" aria-label="Back to top"
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}
      transition={{ duration: reduce ? 0 : .25 }}
      onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
      className="glass icon-btn fixed bottom-5 right-5 z-[70] rounded-full"
    ><ChevronDown size={19} className="rotate-180" /></motion.button>
  )}</AnimatePresence>;
}


export default function PublicProfile() {
  const [copied,setCopied]=useState(false); const toast=useToast();
  const mastheadRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const { handle='nova' }=useParams(); const [params]=useSearchParams(); const navigate=useNavigate(); const [filter,setFilter]=useState('all'); const [sort,setSort]=useState('Newest'); const [search,setSearch]=useState(''); const deferredSearch=useDeferredValue(search);
  const query=useQuery({queryKey:['public-profile',handle],queryFn:({signal})=>api.publicProfile(handle,signal),retry:(count,e)=>!(e instanceof ApiError&&e.status===404)&&count<2});
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
  <section className="container-shell pt-6 sm:pt-10"><Panel elemRef={mastheadRef} className="relative min-h-[540px] overflow-hidden bg-[#0b0f1c] sm:min-h-[560px]"><div data-banner-parallax className="absolute -inset-y-8 inset-x-0"><CoverImage src={p.banner} alt="" data-banner-zoom priority mobileSrc={igdbWideMobileVariant(p.banner)} className="absolute inset-0 opacity-55"/></div><div className="absolute inset-0 bg-gradient-to-r from-[#070a14] via-[#070a14]/75 to-transparent"/><div className="relative flex min-h-[560px] max-w-3xl flex-col justify-end p-6 sm:p-12"><div className="mb-auto flex items-center gap-4"><CoverImage src={p.avatar} alt={`${p.displayName} avatar`} priority className="h-16 w-16 rounded-2xl border border-white/20"/><div><span className="font-mono text-xs text-cyan-200">@{p.handle}</span><p className="mt-1 flex items-center gap-1.5 text-sm text-white/65"><MapPin size={14}/>{p.location}</p></div></div><div data-cinema className="eyebrow cinema-hidden">Player archive · est. {p.since}</div><h1 data-cinema className="cinema-hidden mt-4 text-[clamp(3rem,11vw,9rem)] font-bold leading-[.88] tracking-[-.07em] text-white">{p.displayName.split(' ').map((word, i, arr) => i === arr.length - 1 && arr.length > 1 ? <>{' '}{word}</> : <span key={i}>{i > 0 ? ' ' : ''}{word}</span>)}</h1><p data-cinema className="cinema-hidden mt-6 max-w-xl text-lg leading-8 text-white/75">{p.bio}</p><div className="mt-8 flex flex-wrap gap-3"><a href="#featured" className="btn btn-primary">Enter the collection <ChevronDown size={17}/></a><Button type="button" className="border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={shareProfile}>{copied ? <Check size={17}/> : <Share2 size={17}/>}{copied ? 'Link copied' : 'Share archive'}</Button><div ref={statsRef} data-cinema className="cinema-hidden flex w-full items-end gap-7 border-t border-white/10 pt-5 sm:gap-10">{[[p.games.length,'GAMES'],[Math.round(p.games.reduce((n,g)=>n+(g.hours??0),0)),'HOURS LOGGED'],[p.games.filter(x=>x.award).length,'AWARDS']].map(([value,label]) => (<div key={label as string}><div className="font-mono text-[10px] uppercase tracking-[.24em] text-cyan-200/90">{label}</div><div className="mt-1 text-4xl font-bold leading-none tracking-tight text-white sm:text-5xl"><span data-count={value as number}>{(value as number).toLocaleString('en-US')}</span></div></div>))}</div></div></div></Panel></section>
  <MotionSection id="rig" className="section container-shell" watermark="THE RIG"><SectionHead kicker="01 · Battle station" title={<>The <span className="text-gradient">Rig</span></>} body="A deliberately tuned system. Every component documented like an artifact."/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{p.rig.map((r,i)=><Reveal key={r.id} delay={(i%4)*0.06}><TiltCard><Panel className="group h-full p-5 transition hover:-translate-y-1"><div className="flex justify-between"><Cpu size={20} className={i%2?'text-violet-300':'text-cyan-300'}/><span className="font-mono text-[9px] text-ink/40">0{i+1}</span></div><span className="label mt-10">{r.category}</span><h3 className="text-lg font-semibold">{r.name}</h3><p className="muted mt-2 font-mono text-xs leading-5">{r.detail}</p></Panel></TiltCard></Reveal>)}</div>
  {!p.rig.length && <div className="glass rounded-[22px] p-10 text-center"><Cpu className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">The battle station is undocumented</h3><p className="muted mt-2">This curator has not filed their hardware yet.</p></div>}</MotionSection>
  {featured.length>0 && <TickerStrip games={featured}/>}
  <MotionSection id="featured" className="section container-shell" watermark="HALL OF FAME"><SectionHead kicker="02 · Hall of fame" title={<>The games that <span className="text-gradient">stayed</span></>} body="The permanent collection. The first inductee holds the grand exhibit; every plaque opens into complete field notes."/><div className="grid grid-cols-2 gap-3 sm:hidden">{featured.map((g,i)=><Reveal key={g.id} delay={(i%2)*0.07}><GameCard game={g} onOpen={open}/></Reveal>)}</div>
  <div className="hidden space-y-6 sm:block">
    {featured[0] && <Reveal><GrandExhibit game={featured[0]} onOpen={open}/></Reveal>}
    {featured.length > 1 && (
      <div className="grid gap-5 md:grid-cols-2">
        {featured.slice(1).map((g,i)=><Reveal key={g.id} delay={(i%2)*0.08}><HallPlaque game={g} index={i+1} onOpen={open}/></Reveal>)}
      </div>
    )}
  </div>
  {!featured.length && <div className="glass rounded-[22px] p-10 text-center"><Medal className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl font-semibold">No inductees yet</h3><p className="muted mt-2">The shelf awaits its first permanent resident.</p></div>}</MotionSection>
  <MotionSection id="chronicle" className="section cv-auto container-shell" watermark="THE CHRONICLE"><SectionHead kicker="03 · Chronicle" title="Every save tells a story." body="The complete play history, arranged as a living catalog." action={<div className="flex gap-2"><span aria-live="polite" role="status" className="btn"><SlidersHorizontal size={15}/>{games.length} entries</span></div>}/><Panel className="p-4 sm:p-6"><div className="mb-7 grid gap-3 md:grid-cols-[1fr_auto_auto]"><label className="relative"><span className="sr-only">Search games</span><Search className="absolute left-3 top-3.5 text-ink/40" size={17}/><input className="field pl-10" placeholder="Search the chronicle" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className="field min-w-40" aria-label="Filter by status" value={filter} onChange={e=>setFilter(e.target.value)}>{(['all',...STATUS_ORDER] as Array<'all'|GameStatus>).map(x=><option key={x} value={x}>{x==='all'?'All':STATUS_LABELS[x]}</option>)}</select><select className="field min-w-40" aria-label="Sort games" value={sort} onChange={e=>setSort(e.target.value)}><option>Newest</option><option>Rating</option><option>Title</option></select></div><motion.div layout className="grid gap-3">{games.map(g=><ChronicleRow key={g.id} game={g} onOpen={open}/>)}{!games.length&&<div className="py-16 text-center"><Gamepad2 className="mx-auto text-ink/30"/><h3 className="mt-4 text-xl">No saves found</h3><p className="muted mt-2">Change the filter or search phrase.</p></div>}</motion.div></Panel></MotionSection>
  <MotionSection id="guide" className="section cv-auto container-shell"><SectionHead kicker="04 · AI Guide" title={<>A compass for your <span className="text-gradient">next world</span>.</>} body="Questions answered from this portfolio, never from the wider internet."/><Guide handle={p.handle}/></MotionSection>
  <AnimatePresence>{selected&&<GameDetail game={selected} close={close} onStep={stepGame} showStepper={p.games.length>1}/>}</AnimatePresence>
  <BackToTop/></>;
}
