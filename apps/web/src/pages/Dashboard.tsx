import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Award, Bot, CircleUserRound, Cpu, Gamepad2, GripVertical, Plus, Radio, Settings2 } from 'lucide-react';
import { api, isDemoMode } from '../lib/api';
import { Panel } from '../components/ui';

const tools=[
  {to:'/dashboard/profile',icon:CircleUserRound,title:'Identity',text:'Name, story, avatar and public handle'},
  {to:'/dashboard/rig',icon:Cpu,title:'Rig & peripherals',text:'Document the hardware behind every save'},
  {to:'/dashboard/games',icon:Gamepad2,title:'Game archive',text:'Add from IGDB, review and record playtime'},
  {to:'/dashboard/awards',icon:Award,title:'Awards',text:'Create personal honors and distinctions'},
  {to:'/dashboard/featured',icon:GripVertical,title:'Featured order',text:'Arrange the front shelf of your archive'},
];
const checklist=({hasAvatar,gameCount,reviewCount}:{hasAvatar:boolean;gameCount:number;reviewCount:number})=>[
  hasAvatar?'✓ Avatar uploaded':'○ Upload an avatar',
  gameCount?`✓ ${gameCount} games cataloged`:'○ Add your first game',
  reviewCount?`✓ ${reviewCount} written reviews`:'○ Write at least one review',
];
export default function Dashboard(){
  const {data:p,isLoading}=useQuery({queryKey:['me'],queryFn:()=>api.me()});
  const gameCount=p?.games.length??0;
  const hours=Math.round((p?.games.reduce((sum,entry)=>sum+(entry.hours_played??0),0))??0);
  const reviews=p?.games.filter(entry=>(entry.review?.length??0)>0).length??0;
  const featured=p?.games.filter(entry=>entry.featured).length??0;
  const health=[Boolean(p?.profile.avatar_url),Boolean(p?.rig),gameCount>0,reviews>0,featured>0];
  const score=Math.round(health.filter(Boolean).length/health.length*100);
  return <div className="container-shell py-12">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <div className="eyebrow">Curator studio</div>
        <h1 className="mt-4 text-5xl font-bold tracking-[-.05em]">Welcome back{p ? `, ${p.profile.display_name.split(' ')[0]}.` : '.'}</h1>
        <p className="muted mt-3">Shape the archive. Public pages update the moment you publish.</p>
      </div>
      <div className="flex gap-2">
        <Link className="btn" to={`/u/${p?.profile.handle??''}`}>View archive <ArrowUpRight size={16}/></Link>
        <Link className="btn btn-primary" to="/dashboard/games"><Plus size={16}/> Add game</Link>
      </div>
    </div>
    {isDemoMode&&<Panel className="mt-8 flex items-start gap-3 border-violet-300/20 bg-violet-400/5 p-4"><Radio className="mt-0.5 text-violet-300" size={18}/><div><b className="text-sm">Safe demo workspace</b><p className="muted mt-1 text-sm">Edits stay in this browser and never grant production authorization.</p></div></Panel>}
    {!isDemoMode&&!isLoading&&!p&&<Panel className="mt-8 border-cyan-300/20 bg-cyan-400/5 p-4"><b className="text-sm">Create your identity first</b><p className="muted mt-1 text-sm">Visit onboarding to claim a handle before curating.</p></Panel>}
    <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="grid gap-4 sm:grid-cols-2">
        {tools.map(({to,icon:Icon,title,text},i)=><Link key={to} to={to} className="glass group min-h-52 rounded-[22px] p-6 transition hover:-translate-y-1 hover:border-cyan-300/30">
          <div className="flex justify-between"><span className={`grid h-11 w-11 place-items-center rounded-xl ${i%2?'bg-violet-400/10 text-violet-300':'bg-cyan-400/10 text-cyan-300'}`}><Icon size={20}/></span><ArrowUpRight className="muted transition group-hover:text-cyan-300"/></div>
          <h2 className="mt-12 text-xl font-semibold">{title}</h2><p className="muted mt-2 text-sm leading-6">{text}</p>
        </Link>)}
      </div>
      <div className="space-y-4">
        <Panel className="p-6">
          <span className="label">ARCHIVE HEALTH</span>
          <div className="mt-5 flex items-end justify-between"><b className="text-5xl">{score}<span className="text-xl text-ink/40">%</span></b><Settings2 className="text-cyan-300"/></div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-gradient-to-r from-cyan-300 to-violet-400" style={{width:`${score}%`}}/></div>
          <ul className="muted mt-5 space-y-3 text-sm">{checklist({hasAvatar:Boolean(p?.profile.avatar_url),gameCount,reviewCount:reviews}).map(item=><li key={item}>{item}</li>)}</ul>
        </Panel>
        <Panel className="p-6">
          <span className="label">COLLECTION SNAPSHOT</span>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[['Games',gameCount],['Hours',hours],['Awards',p?.awards.length??0]].map(([label,value])=>(
              <div key={String(label)} className="rounded-xl border border-white/10 p-3"><dt className="muted font-mono text-[9px] uppercase tracking-wider">{label}</dt><dd className="mt-1 text-2xl">{value}</dd></div>
            ))}
          </dl>
        </Panel>
        <Panel className="p-6"><Bot className="text-violet-300"/><h2 className="mt-8 text-xl font-semibold">Guide is listening</h2><p className="muted mt-2 text-sm leading-6">Longer reviews make profile-scoped recommendations more precise.</p></Panel>
      </div>
    </div>
  </div>;
}
