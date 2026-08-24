import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Auth0Provider } from '@auth0/auth0-react';
import { HelmetProvider } from 'react-helmet-async';
import { MotionConfig } from 'framer-motion';
import App from './App';
import { DemoAuthBridge, RealAuthBridge } from './lib/auth';
import { isDemoMode } from './lib/api';
import { ThemeProvider, ToastProvider } from './components/ui';
import './styles.css';

const queryClient=new QueryClient({defaultOptions:{queries:{staleTime:60_000,retry:1,refetchOnWindowFocus:false},mutations:{retry:false}}});
const content=<React.StrictMode><HelmetProvider><QueryClientProvider client={queryClient}><BrowserRouter><MotionConfig reducedMotion="user"><ThemeProvider><ToastProvider><App/></ToastProvider></ThemeProvider></MotionConfig></BrowserRouter></QueryClientProvider></HelmetProvider></React.StrictMode>;
const root=ReactDOM.createRoot(document.getElementById('root')!);
if(isDemoMode){root.render(<DemoAuthBridge>{content}</DemoAuthBridge>)}else{root.render(<Auth0Provider domain={import.meta.env.VITE_AUTH0_DOMAIN} clientId={import.meta.env.VITE_AUTH0_CLIENT_ID} authorizationParams={{redirect_uri:`${location.origin}/auth/callback`,audience:import.meta.env.VITE_AUTH0_AUDIENCE}} onRedirectCallback={state=>history.replaceState({},'',state?.returnTo??'/dashboard')}><RealAuthBridge>{content}</RealAuthBridge></Auth0Provider>)}
