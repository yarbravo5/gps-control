import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { changePasswordRequest, getCurrentUser, loginRequest, logoutRequest, refreshRequest } from "./authApi";
import { getCsrfToken } from "./csrf";
import { clearAuthTokens, setAuthTokens, subscribeToSessionExpiration } from "./authTokenStore";
import type { AuthUser, ChangePasswordRequest, LoginRequest } from "./types";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (payload: ChangePasswordRequest) => Promise<void>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
let restoreSessionPromise: Promise<AuthUser | null> | null = null;

function restoreSession(): Promise<AuthUser | null> {
  if (restoreSessionPromise) return restoreSessionPromise;
  restoreSessionPromise = (async () => {
    const csrfToken = getCsrfToken();
    if (!csrfToken) return null;
    const tokens = await refreshRequest(csrfToken);
    setAuthTokens(tokens.access_token, tokens.csrf_token);
    return getCurrentUser();
  })().catch(() => {
    clearAuthTokens();
    return null;
  }).finally(() => { restoreSessionPromise = null; });
  return restoreSessionPromise;
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSessionExpiration(() => {
      clearAuthTokens();
      setUser(null);
    });
    void restoreSession().then((restoredUser) => {
      if (active) setUser(restoredUser);
    }).finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);

  const login = useCallback(async (payload: LoginRequest) => {
    const result = await loginRequest(payload);
    setAuthTokens(result.access_token, result.csrf_token);
    setUser(result.user);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutRequest(); } finally { clearAuthTokens(); setUser(null); }
  }, []);

  const changePassword = useCallback(async (payload: ChangePasswordRequest) => {
    await changePasswordRequest(payload);
    clearAuthTokens();
    setUser(null);
  }, []);

  const hasPermission = useCallback((permission: string) => Boolean(user?.permissions.includes(permission)), [user]);
  const value = useMemo<AuthContextValue>(() => ({ user, isLoading, isAuthenticated: Boolean(user), login, logout, changePassword, hasPermission }), [user, isLoading, login, logout, changePassword, hasPermission]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth debe utilizarse dentro de AuthProvider.");
  return context;
}

