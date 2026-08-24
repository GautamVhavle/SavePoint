import { useAuth0 } from '@auth0/auth0-react';
import { useEffect, type PropsWithChildren } from 'react';
import { configureAuthToken } from './api';
import { AuthContext, type AuthState } from './auth';

/** Kept in its own module so demo mode never loads the Auth0 SDK. */
export function RealAuthBridge({ children }: PropsWithChildren) {
  const auth = useAuth0();
  useEffect(() => {
    configureAuthToken(() => auth.getAccessTokenSilently());
    return () => configureAuthToken(async () => undefined);
  }, [auth]);
  const value: AuthState = { isAuthenticated: auth.isAuthenticated, isLoading: auth.isLoading, name: auth.user?.name, login: (returnTo='/dashboard') => void auth.loginWithRedirect({ appState: { returnTo } }), logout: () => auth.logout({ logoutParams: { returnTo: window.location.origin } }), token: async () => auth.getAccessTokenSilently() };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
