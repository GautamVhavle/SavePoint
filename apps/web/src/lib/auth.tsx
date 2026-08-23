import { createContext, useContext, useEffect, type PropsWithChildren } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { configureAuthToken } from './api';

export interface AuthState { isAuthenticated: boolean; isLoading: boolean; name?: string; login: (returnTo?: string) => void; logout: () => void; token: () => Promise<string | undefined>; }
const AuthContext = createContext<AuthState>({ isAuthenticated: false, isLoading: false, login: () => undefined, logout: () => undefined, token: async () => undefined });
export const useAuth = () => useContext(AuthContext);
export function DemoAuthBridge({ children }: PropsWithChildren) { return <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, name: 'Nova Reyes', login: () => undefined, logout: () => undefined, token: async () => undefined }}>{children}</AuthContext.Provider>; }
export function RealAuthBridge({ children }: PropsWithChildren) {
  const auth = useAuth0();
  useEffect(() => {
    configureAuthToken(() => auth.getAccessTokenSilently());
    return () => configureAuthToken(async () => undefined);
  }, [auth]);
  const value: AuthState = { isAuthenticated: auth.isAuthenticated, isLoading: auth.isLoading, name: auth.user?.name, login: (returnTo='/dashboard') => void auth.loginWithRedirect({ appState: { returnTo } }), logout: () => auth.logout({ logoutParams: { returnTo: window.location.origin } }), token: async () => auth.getAccessTokenSilently() };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
