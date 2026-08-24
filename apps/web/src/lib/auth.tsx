import { createContext, useContext, type PropsWithChildren } from 'react';

export interface AuthState { isAuthenticated: boolean; isLoading: boolean; name?: string; login: (returnTo?: string) => void; logout: () => void; token: () => Promise<string | undefined>; }
export const AuthContext = createContext<AuthState>({ isAuthenticated: false, isLoading: false, login: () => undefined, logout: () => undefined, token: async () => undefined });
export const useAuth = () => useContext(AuthContext);
export function DemoAuthBridge({ children }: PropsWithChildren) { return <AuthContext.Provider value={{ isAuthenticated: true, isLoading: false, name: 'Nova Reyes', login: () => undefined, logout: () => undefined, token: async () => undefined }}>{children}</AuthContext.Provider>; }
