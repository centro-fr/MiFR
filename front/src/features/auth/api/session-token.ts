// Sesión: JWT en memoria + sessionStorage versionado (sobrevive recargas
// de la misma pestaña, se libera al cerrar el navegador).
// Riesgo conocido: ante XSS cualquier token en almacenamiento web es legible.
// La corrección definitiva es sesión con cookie httpOnly + refresh en el back;
// mientras tanto se minimiza exposición (sin localStorage persistente,
// solo campos mínimos, borrado en 401/logout). Ver client.ts.
import type { AuthUser } from "@/types/auth";

const STORAGE_KEY = "mifr:session-token:v1";
const AVATAR_STORAGE_KEY = "mifr:user-avatar:v1";
const USER_STORAGE_KEY = "mifr:session-user:v1";

let sessionToken: string | null = null;
let userAvatarUrl: string | null = null;

function readStored(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function getSessionToken(): string | null {
  if (!sessionToken) sessionToken = readStored();
  return sessionToken;
}

export function setSessionToken(token: string): void {
  sessionToken = token;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Sin almacenamiento (modo privado): la sesión vive solo en memoria.
  }
}

export function getStoredAvatarUrl(): string | null {
  if (!userAvatarUrl) {
    try {
      userAvatarUrl = window.sessionStorage.getItem(AVATAR_STORAGE_KEY);
    } catch {
      userAvatarUrl = null;
    }
  }
  return userAvatarUrl;
}

export function setStoredAvatarUrl(url: string): void {
  userAvatarUrl = url;
  try {
    window.sessionStorage.setItem(AVATAR_STORAGE_KEY, url);
  } catch {
    // Sin almacenamiento (modo privado)
  }
}

export function clearStoredAvatarUrl(): void {
  userAvatarUrl = null;
  try {
    window.sessionStorage.removeItem(AVATAR_STORAGE_KEY);
  } catch {
    // Sin almacenamiento
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = window.sessionStorage.getItem(USER_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  try {
    window.sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch {
    // Sin almacenamiento
  }
}

export function clearStoredUser(): void {
  try {
    window.sessionStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // Sin almacenamiento
  }
}

export function clearSessionToken(): void {
  sessionToken = null;
  clearStoredAvatarUrl();
  clearStoredUser();
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    // Limpieza de clave legacy en localStorage (migración de seguridad).
    window.localStorage.removeItem("mifr:session-token");
  } catch {
    // Sin almacenamiento: nada que limpiar.
  }
}
