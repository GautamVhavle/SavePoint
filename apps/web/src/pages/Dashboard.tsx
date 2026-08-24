import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Bot, CheckCircle2, Circle, CircleUserRound, Cpu, Gamepad2, GripVertical, Plus, Radio, Settings2 } from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { Button, Panel } from '../components/ui';

const tools=[
  {to:'/dashboard/profile',icon:CircleUserRound,title:'Identity',text:'Name, story, avatar and public handle'},
  {to:'/dashboard/rig',icon:Cpu,title:'Rig & peripherals',text:'Document the hardware behind every save'},
  {to:'/dashboard/games',icon:Gamepad2,title:'Game archive',text:'Add from IGDB, review and record playtime'},
  {to:'/dashboard/awards',icon:Award,title:'Awards',text:'Create personal honors and distinctions'},
  {to:'/dashboard/featured',icon:GripVertical,title:'Featured order',text:'Arrange the front shelf of your archive'},
];
const checklist=({hasAvatar,gameCount,reviewCount}:{hasAvatar:boolean;gameCount:number;reviewCount:number})=>[
  {done:hasAvatar,label:'Avatar uploaded',todo:'Upload an avatar'},
  {done:gameCount>0,label:`${gameCount} game${gameCount===1?'':'s'} cataloged`,todo:'Add your first game'},
  {done:reviewCount>0,label:`${reviewCount} written review${reviewCount===1?'':'s'}`,todo:'Write at least one review'},
];
function SnapshotSkeleton(){return <div aria-hidden className="space-y-4"><div className="glass rounded-[22px] p-6"><div className="skeleton h-3 w-28 rounded-full"/><div className="mt-5 skeleton h-9 w-24 rounded-xl"/><div className="mt-5 skeleton h-1.5 w-full rounded-full"/><div className="mt-6 space-y-3">{[1,2,3].map(i=><div key={i} className="skeleton h-3 rounded-full" style={{width:`${88-i*14}%`}}/>)}</div></div><div className="glass rounded-[22px] p-6"><div className="skeleton h-3 w-32 rounded-full"/><div className="mt-4 grid grid-cols-3 gap-3">{[1,2,3].map(i=><div key={i} className="skeleton h-16 rounded-xl"/>)}</div></div></div>;}
export default function Dashboard(){
  const query=useQuery({queryKey:['me'],queryFn:()=>api.me()});
  const p=query.data; const isLoading=query.isPending;  const gameCount=p?.games.length??0;
  const hours=Math.round((p?.games.reduce((sum,entry)=>sum+(entry.hours_played??0),0))??0);
  const reviews=p?.games.filter(entry=>(entry.review?.length??0)>0).length??0;
  const featured=p?.games.filter(entry=>entry.featured).length??0;
  const health=[Boolean(p?.profile.avatar_url),Boolean(p?.rig),gameCount>0,reviews>0,featured>0];
  const score=Math.round(health.filter(Boolean).length/health.length*100);
  return <div className="container-shell py-12">
    <Helmet><title>Studio · SavePoint</title></Helmet>
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="eyebrow">Curator studio</div>
        <h1 className="mt-4 text-5xl font-bold tracking-[-.05em]">Welcome back{p ? `, ${p.profile.display_name.split(' ')[0]}.` : '.'}</h1>
        <p className="muted mt-3">Shape the archive. Public pages update the moment you publish.</p>
      </div>
      <div className="flex gap-2">
        {p ? <Link className="btn" to={`/u/${p.profile.handle}`}>View archive <ArrowUpRight size={16}/></Link>
          : <button className="btn" disabled aria-disabled="true">View archive <ArrowUpRight size={16}/></button>}
        {p ? <Link className="btn btn-primary" to="/dashboard/games"><Plus size={16}/> Add game</Link>
          : <button className="btn btn-primary" disabled aria-disabled="true"><Plus size={16}/> Add game</button>}
      </div>
    </div>
    {isDemoMode&&<Panel className="mt-8 flex items-start gap-3 border-violet-300/20 bg-violet-400/5 p-4"><Radio className="mt-0.5 text-violet-300" size={18}/><div><b className="text-sm">Safe demo workspace</b><p className="muted mt-1 text-sm">Edits stay in this browser and never grant production authorization.</p></div></Panel>}
    {!isDemoMode&&!isLoading&&query.isError&&<Panel className="mt-8 flex items-start gap-3 border-rose-300/20 bg-rose-400/5 p-4"><Radio className="mt-0.5 text-rose-300" size={18}/><div><b className="text-sm">Could not load your archive</b><p className="muted mt-1 text-sm">Check your connection, then try again.</p><Button className="mt-3" onClick={() => void query.refetch()}>Retry</Button></div></Panel>}
    {!isDemoMode&&!isLoading&&!query.isError&&!p&&<Panel className="mt-8 flex flex-wrap items-center justify-between gap-3 border-cyan-300/20 bg-cyan-400/5 p-4"><div><b className="text-sm">Create your identity first</b><p className="muted mt-1 text-sm">Claim a handle before curating games and awards.</p></div><Link className="btn btn-primary" to="/onboarding">Start onboarding</Link></Panel>}
    <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(({to,icon:Icon,title,text},i)=>{
          const last=i===tools.length-1;
          return <Link key={to} to={to} className={`glass group min-h-52 rounded-[22px] p-6 transition hover:-translate-y-1 hover:border-cyan-300/30 ${last?'sm:col-span-2 sm:min-h-0':''}`}>
            <div className="flex justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${i%2?'bg-violet-400/10 text-violet-300':'bg-cyan-400/10 text-cyan-300'}`}><Icon size={20}/></span><ArrowUpRight className="muted transition group-hover:text-cyan-300"/></div>
            <h2 className={`text-xl font-semibold ${last?'mt-6':'mt-12'}`}>{title}</h2><p className="muted mt-2 text-sm leading-6">{text}</p>
          </Link>;
        })}
      </div>
      {isLoading ? <SnapshotSkeleton/> : <div className="space-y-4">
        <Panel className="p-6">
          <span className="label">ARCHIVE HEALTH</span>
          <div className="mt-5 flex items-end justify-between"><b className="text-5xl tabular-nums">{score}<span className="text-xl text-ink/40">%</span></b><Settings2 className="text-cyan-300"/></div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-violet-400 transition-[width] duration-700 ease-out" style={{width:`${score}%`}}/></div>
          <ul className="muted mt-5 space-y-3 text-sm">{checklist({hasAvatar:Boolean(p?.profile.avatar_url),gameCount,reviewCount:reviews}).map(item=>(
            <li key={item.todo} className="flex items-center gap-2.5">
              {item.done ? <CheckCircle2 size={16} className="shrink-0 text-emerald-300"/> : <Circle size={16} className="shrink-0 opacity-50"/>}
              <span>{item.done?item.label:item.todo}</span>
            </li>))}
          </ul>
        </Panel>
        <Panel className="p-6">
          <span className="label">COLLECTION SNAPSHOT</span>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[['Games',gameCount],['Hours',hours],['Awards',p?.awards.length??0]].map(([label,value])=>(
              <div key={String(label)} className="rounded-xl border border-white/10 p-3"><dt className="muted font-mono text-[9px] uppercase tracking-wider">{label}</dt><dd className="mt-1 text-2xl tabular-nums">{Number(value).toLocaleString('en-US')}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel className="p-6"><Bot className="text-violet-300"/><h2 className="mt-8 text-xl font-semibold">Guide is listening</h2><p className="muted mt-2 text-sm leading-6">Longer reviews make profile-scoped recommendations more precise.</p></Panel>
      </div>}
    </div>
  </div>;
}
