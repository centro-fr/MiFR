import { useEffect, useState, type ReactNode } from "react";
import { cerrarSesion as apiCerrarSesion, iniciarSesionConGoogle, obtenerPerfil } from "../api/usuario";
import type { SesionActiva } from "../types/usuario";
import { AuthContext } from "./auth-context";

const STORAGE_KEY = "mifr_sesion_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<SesionActiva | null>(null);
  const [cargando, setCargando] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(sessionStorage.getItem(STORAGE_KEY));
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenGuardado = sessionStorage.getItem(STORAGE_KEY);
    if (!tokenGuardado) return;

    let cancelado = false;
    obtenerPerfil(tokenGuardado)
      .then((perfil) => {
        if (!cancelado) {
          setSesion({ ...perfil, token: tokenGuardado });
        }
      })
      .catch(() => {
        if (!cancelado) {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  async function loginConGoogle(idToken: string) {
    setCargando(true);
    setError(null);
    try {
      const nuevaSesion = await iniciarSesionConGoogle(idToken);
      setSesion(nuevaSesion);
      sessionStorage.setItem(STORAGE_KEY, nuevaSesion.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
      throw err;
    } finally {
      setCargando(false);
    }
  }

  async function loginConToken(token: string) {
    setCargando(true);
    setError(null);
    try {
      const perfil = await obtenerPerfil(token.trim());
      const nuevaSesion: SesionActiva = { ...perfil, token: token.trim() };
      setSesion(nuevaSesion);
      sessionStorage.setItem(STORAGE_KEY, nuevaSesion.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Token inválido o expirado");
      throw err;
    } finally {
      setCargando(false);
    }
  }

  async function logout() {
    if (sesion?.token) {
      try {
        await apiCerrarSesion(sesion.token);
      } catch {
        // Fallback silencioso
      }
    }
    sessionStorage.removeItem(STORAGE_KEY);
    setSesion(null);
    setError(null);
    // @ts-expect-error -- GIS
    window.google?.accounts.id?.disableAutoSelect();
  }

  async function refrescar() {
    if (!sesion?.token) return;
    try {
      const perfil = await obtenerPerfil(sesion.token);
      setSesion({ ...perfil, token: sesion.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar sesión");
    }
  }

  function tieneRol(rol: string): boolean {
    return sesion?.roles.includes(rol) ?? false;
  }

  function tienePermiso(permiso: string): boolean {
    return sesion?.permisos.includes(permiso) ?? false;
  }

  return (
    <AuthContext.Provider
      value={{
        sesion,
        cargando,
        error,
        loginConGoogle,
        loginConToken,
        logout,
        refrescar,
        limpiarError: () => setError(null),
        tieneRol,
        tienePermiso,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
