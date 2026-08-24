import { useState } from 'react';
import { ArrowRight, Check, Gamepad2, LoaderCircle, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Panel, useToast } from '../components/ui';
import { useAuth } from '../lib/auth';
import { api, ApiError } from '../lib/api';
import { onboardingSchema } from '../lib/schemas';

const steps=[
  {title:'Claim your archive',body:'Choose the player identity that will anchor every artifact.'},
  {title:'Set your curator signal',body:'Tell visitors what makes a game stay with you.'},
  {title:'Ready player one',body:'Your studio is ready. Start with a game or tune your profile first.'},
];

export default function Onboarding(){
  const [step,setStep]=useState(0);
  const [displayName,setName]=useState('');
  const [handle,setHandle]=useState('');
  const [bio,setBio]=useState('');
  const [saving,setSaving]=useState(false);
  const [formError,setFormError]=useState('');
  const toast=useToast();
  const navigate=useNavigate();
  const auth=useAuth();
  const nameOk=onboardingSchema.shape.displayName.safeParse(displayName).success;
  const handleOk=onboardingSchema.shape.handle.safeParse(handle).success;
  const finish=async()=>{
    setFormError('');
    const parsed=onboardingSchema.safeParse({displayName,handle,bio});
    if(!parsed.success){
      const issue=parsed.error.issues[0];
      setFormError(issue?.message??'Check the highlighted fields.');
      return;
    }
    if(!auth.isAuthenticated){auth.login('/onboarding');return;}
    setSaving(true);
    try{
      await api.createMe({handle:parsed.data.handle,display_name:parsed.data.displayName,bio:parsed.data.bio||null});
      toast.show(`Archive claimed · welcome to the studio, ${parsed.data.displayName.split(' ')[0]}.`);
      navigate('/dashboard');
    }catch(error){
      toast.show(error instanceof ApiError?error.message:'Could not reserve that handle.','error');
    }finally{setSaving(false);}
  };
  return <div className="container-shell grid min-h-[calc(100vh-73px)] place-items-center py-10"><Helmet><title>Claim your archive · SavePoint</title><meta name="robots" content="noindex"/></Helmet><Panel className="w-full max-w-3xl overflow-hidden">
    <div className="h-1 bg-white/5"><motion.div className="h-full bg-gradient-to-r from-cyan-300 to-violet-400" animate={{width:`${(step+1)/3*100}%`}}/></div>
    <div className="p-6 sm:p-12">
      <div className="mb-10 flex items-center justify-between">
        <div className="eyebrow">Onboarding · 0{step+1}</div><span aria-live="polite" role="status" className="font-mono text-xs text-ink/40">Step {step+1} of 3</span>
      </div>
      <AnimatePresence mode="wait"><motion.div key={step} initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}}>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300">{step===2?<Check/>:step===1?<Sparkles/>:<Gamepad2/>}</div>
        <h1 className="mt-6 text-4xl font-bold tracking-[-.05em] sm:text-6xl">{steps[step].title}</h1>
        <p className="muted mt-4 text-lg leading-8">{steps[step].body}</p>
        {step===0&&<div className="mt-8 grid gap-4 sm:grid-cols-2" onKeyDown={event=>{if(event.key==='Enter'&&nameOk&&handleOk){event.preventDefault();setStep(1);}}}>
          <label><span className="label">DISPLAY NAME</span><input className="field" value={displayName} onChange={event=>setName(event.target.value)} placeholder="Nova Reyes" maxLength={60}/>
            {displayName.trim().length>0&&displayName.trim().length<2&&<p className="field-error">At least 2 characters.</p>}
          </label>
          <label><span className="label">PUBLIC HANDLE</span><input className="field" value={handle} onChange={event=>setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_-]/g,''))} placeholder="nova" autoComplete="off" spellCheck={false} maxLength={30}/>
            <p className={`mt-1.5 font-mono text-[11px] ${onboardingSchema.shape.handle.safeParse(handle).success?'text-emerald-300':'muted'}`}>{onboardingSchema.shape.handle.safeParse(handle).success?'Looks good · reserved when you finish':'3+ characters · lowercase letters, numbers, _ or - (must end with a letter or number)'}</p>
          </label>
        </div>}
        {step===1&&<div className="mt-8"><label><span className="label">WHAT DO YOU PLAY FOR?</span><textarea className="field" value={bio} onChange={event=>setBio(event.target.value)} maxLength={2000} placeholder="Discovery, atmosphere, and stories that trust me to pay attention."/><p aria-hidden className="muted mt-1 text-right font-mono text-[10px]">{2000-bio.length} left</p></label></div>}
        {step===2&&<div className="mt-8 rounded-2xl border border-cyan-300/20 bg-cyan-300/5 p-5"><b>Your archive URL is ready</b><p className="muted mt-1 break-all font-mono text-sm">{window.location.origin}/u/{handle||'your-handle'}</p></div>}
      </motion.div></AnimatePresence>
      {formError&&<p className="field-error" role="alert">{formError}</p>}
      <div className="mt-10 flex justify-between">
        <Button disabled={!step} onClick={()=>setStep(s=>s-1)}>Back</Button>
        {step<2
          ? <Button className="btn-primary" disabled={step===0&&(!nameOk||!handleOk)} onClick={()=>setStep(s=>s+1)}>Continue <ArrowRight size={17}/></Button>
          : <Button className="btn-primary" disabled={saving||!displayName.trim()||!handle.trim()} onClick={() => void finish()}>
              {saving ? <LoaderCircle className="animate-spin" size={17}/> : <ArrowRight size={17}/>}
              {auth.isAuthenticated?'Reserve and enter studio':'Sign in securely'}
            </Button>}
      </div>
    </div>
  </Panel></div>;
}
