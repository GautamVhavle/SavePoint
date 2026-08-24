import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { isDemoMode } from './lib/api';
import { ThemeProvider, ToastProvider } from './components/ui';
import './styles.css';

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:60_000,retry:1,refetchOnWindowFocus:false},mutations:{retry:false}}});
const content=<React.StrictMode><HelmetProvider><QueryClientProvider client={queryClient}><BrowserRouter><MotionConfig reducedMotion="user"><ThemeProvider><ToastProvider><App/></ToastProvider></ThemeProvider></MotionConfig></BrowserRouter></QueryClientProvider></HelmetProvider></React.StrictMode>;
const root=ReactDOM.createRoot(document.getElementById('root')!);
// The auth SDK is only needed in live mode; keep it out of the demo-mode
// payload by resolving each bridge (and Auth0) on demand.
if(isDemoMode){
  void import('./lib/auth').then(({ DemoAuthBridge })=>{
    root.render(<DemoAuthBridge>{content}</DemoAuthBridge>);
  });
}else{
  void Promise.all([import('@auth0/auth0-react'), import('./lib/auth0-bridge')]).then(([{ Auth0Provider }, { RealAuthBridge }])=>{
    root.render(
      <Auth0Provider domain={import.meta.env.VITE_AUTH0_DOMAIN} clientId={import.meta.env.VITE_AUTH0_CLIENT_ID} authorizationParams={{redirect_uri:`${location.origin}/auth/callback`,audience:import.meta.env.VITE_AUTH0_AUDIENCE}} onRedirectCallback={state=>history.replaceState({},'',state?.returnTo??'/dashboard')}>
        <RealAuthBridge>{content}</RealAuthBridge>
      </Auth0Provider>,
    );
  });
}
