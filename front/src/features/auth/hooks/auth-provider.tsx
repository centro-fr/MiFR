import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe, postGoogleLogin, postLogout } from "@/features/auth/api/auth-api";
import { AuthContext } from "@/features/auth/hooks/auth-context";
import type { AuthContextValue } from "@/features/auth/hooks/auth-context";
import type { AuthUser } from "@/types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    getMe()
      .then((restored) => {
        if (active) setUser(restored);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    const onUnauthorized = () => setUser(null);
    window.addEventListener("mifr:unauthorized", onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("mifr:unauthorized", onUnauthorized);
    };
  }, []);

  const login = useCallback(async (idToken: string) => {
    const session = await postGoogleLogin(idToken);
    setUser(session.usuario);
    return session.usuario;
  }, []);

  const logout = useCallback(async () => {
    try {
      await postLogout();
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, logout }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthUser };
