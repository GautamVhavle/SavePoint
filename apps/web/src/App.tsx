import { lazy, Suspense, useEffect, useRef } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArchiveX, LoaderCircle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { Shell } from './components/Shell';
import { Button } from './components/ui';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './lib/auth';
import { useIntentPrefetch } from './lib/use-intent-prefetch';

const Landing=lazy(()=>import('./pages/Landing'));const PublicProfile=lazy(()=>import('./pages/PublicProfile'));const Dashboard=lazy(()=>import('./pages/Dashboard'));const Editors=lazy(()=>import('./pages/Editors'));const Onboarding=lazy(()=>import('./pages/Onboarding'));
function Loading(){return <div className="grid min-h-[60vh] place-items-center" role="status"><LoaderCircle className="animate-spin text-cyan-300"/><span className="sr-only">Loading route</span></div>}
/** Shared chrome for full-viewport statements: 404, sign-in gate, auth errors. */
function CenteredState({title,eyebrow,icon,alert=false,children,titleClassName='mt-5 text-5xl font-bold'}:{title:React.ReactNode;eyebrow?:string;icon?:React.ReactNode;alert?:boolean;children?:React.ReactNode;titleClassName?:string}){
  return <div className="container-shell grid min-h-[70vh] place-items-center text-center"><div role={alert?'alert':undefined}>{icon}{eyebrow&&<div className={`eyebrow justify-center ${icon?'mt-7':''}`}>{eyebrow}</div>}<h1 className={titleClassName}>{title}</h1>{children}</div></div>;
}
function Protected({children}:{children:React.ReactNode}){const auth=useAuth(),location=useLocation();if(auth.isLoading)return <Loading/>;if(!auth.isAuthenticated)return <CenteredState eyebrow="Private collection" title="Curator access required."><Helmet><title>Curator access required · SavePoint</title></Helmet><p className="muted mt-4">Sign in with Auth0 to enter your studio. Server permissions protect every write.</p><Button className="btn-primary mt-7" onClick={()=>auth.login(location.pathname)}>Continue securely</Button></CenteredState>;return children}
function NotFound(){return <CenteredState icon={<ArchiveX className="mx-auto text-violet-300" size={42}/>} eyebrow="404 · Lost sector" titleClassName="mt-5 text-[clamp(3rem,9vw,6rem)] font-bold leading-none tracking-[-.05em]" title={<>No save<br/><span className="text-gradient">exists here.</span></>}><Helmet><title>Lost sector · SavePoint</title></Helmet><p className="muted mt-3">Return to the archive before the signal fades.</p><div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="btn btn-primary" to="/">Return home</Link><Link className="btn" to="/u/nova">Explore the live demo</Link></div></CenteredState>}
function ScrollToTop(){const {pathname}=useLocation();const first=useRef(true);useEffect(()=>{
  if(window.location.hash)return;
  window.scrollTo({top:0,left:0,behavior:'instant' as ScrollBehavior});
  // SPA navigations otherwise strand focus behind: move it into the new
  // page so screen readers announce its context (title + landmarks).
  if(first.current){first.current=false;return;}
  const main=document.querySelector('main');
  if(main){main.setAttribute('tabindex','-1');main.focus({preventScroll:true});}
},[pathname]);return null}
function AuthCallback(){const [params]=useSearchParams();const error=params.get('error');const description=params.get('error_description');if(error)return <CenteredState alert eyebrow="Sign-in interrupted" titleClassName="mt-5 text-4xl font-bold" title="The gate did not open."><Helmet><title>Sign-in interrupted · SavePoint</title></Helmet><p className="muted mx-auto mt-4 max-w-md">{description||'The sign-in flow was cancelled or expired. Return home and try again.'}</p><a className="btn btn-primary mt-7" href="/">Return home</a></CenteredState>;return <Loading/>}
export default function App(){const location=useLocation();useIntentPrefetch(true);return <ErrorBoundary><div className="grain"><Suspense fallback={<Loading/>}><ScrollToTop/><AnimatePresence mode="wait" initial={false}><Routes location={location} key={location.pathname}><Route element={<Shell/>}><Route index element={<Landing/>}/><Route path="u/:handle" element={<PublicProfile/>}/><Route path="demo" element={<Navigate to="/u/nova" replace/>}/><Route path="onboarding" element={<Onboarding/>}/><Route path="dashboard" element={<Protected><Dashboard/></Protected>}/><Route path="dashboard/:editor" element={<Protected><Editors/></Protected>}/><Route path="auth/callback" element={<AuthCallback/>}/><Route path="*" element={<NotFound/>}/></Route></Routes></AnimatePresence></Suspense></div></ErrorBoundary>}
