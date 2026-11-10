import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getMe, postGoogleLogin, postLoginDesarrollo, postLogout } from "@/features/auth/api/auth-api";
import {
  clearSessionToken,
  clearStoredAvatarUrl,
  clearStoredUser,
  getStoredAvatarUrl,
  getStoredUser,
  setStoredAvatarUrl,
  setStoredUser,
} from "@/features/auth/api/session-token";
import { extraerFotoDeGoogleToken } from "@/features/auth/utils/google-token";
import { AuthContext } from "@/features/auth/hooks/auth-context";
import type { AuthContextValue } from "@/features/auth/hooks/auth-context";
import type { AuthUser } from "@/types/auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(() => getStoredUser() === null);
  const authGenerationRef = useRef(0);
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;
    const generationAtStart = authGenerationRef.current;
    getMe()
      .then((restored) => {
        if (active && authGenerationRef.current === generationAtStart) {
          const avatarUrl = getStoredAvatarUrl();
          const usuarioActualizado: AuthUser = {
            ...restored,
            fotoUrl: avatarUrl ?? restored.fotoUrl ?? null,
          };
          setStoredUser(usuarioActualizado);
          setUser(usuarioActualizado);
        }
      })
      .catch(() => {
        if (active && authGenerationRef.current === generationAtStart) {
          clearStoredUser();
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    const onUnauthorized = () => {
      authGenerationRef.current += 1;
      clearStoredAvatarUrl();
      clearStoredUser();
      setUser(null);
    };
    window.addEventListener("mifr:unauthorized", onUnauthorized);
    return () => {
      active = false;
      window.removeEventListener("mifr:unauthorized", onUnauthorized);
    };
  }, []);

  const login = useCallback(async (idToken: string) => {
    authGenerationRef.current += 1;
    const fotoGoogle = extraerFotoDeGoogleToken(idToken);
    if (fotoGoogle) {
      setStoredAvatarUrl(fotoGoogle);
    }
    const session = await postGoogleLogin(idToken);
    const usuarioConFoto: AuthUser = {
      ...session.usuario,
      fotoUrl: fotoGoogle ?? session.usuario.fotoUrl ?? null,
    };
    setStoredUser(usuarioConFoto);
    setUser(usuarioConFoto);
    setIsLoading(false);
    return usuarioConFoto;
  }, []);

  const loginDesarrollo = useCallback(async (email: string) => {
    authGenerationRef.current += 1;
    const session = await postLoginDesarrollo(email);
    setStoredUser(session.usuario);
    setUser(session.usuario);
    setIsLoading(false);
    return session.usuario;
  }, []);

  const logout = useCallback(async () => {
    authGenerationRef.current += 1;
    try {
      await postLogout();
    } finally {
      clearSessionToken();
      clearStoredAvatarUrl();
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: user !== null, isLoading, login, loginDesarrollo, logout }),
    [user, isLoading, login, loginDesarrollo, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export type { AuthUser };
