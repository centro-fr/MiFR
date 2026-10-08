// Sesión: JWT en memoria + sessionStorage versionado (sobrevive recargas
// de la misma pestaña, se libera al cerrar el navegador).
// Riesgo conocido: ante XSS cualquier token en almacenamiento web es legible.
// La corrección definitiva es sesión con cookie httpOnly + refresh en el back;
// mientras tanto se minimiza exposición (sin localStorage persistente,
// solo campos mínimos, borrado en 401/logout). Ver client.ts.
const STORAGE_KEY = "mifr:session-token:v1";

let sessionToken: string | null = null;

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

export function clearSessionToken(): void {
  sessionToken = null;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    // Limpieza de clave legacy en localStorage (migración de seguridad).
    window.localStorage.removeItem("mifr:session-token");
  } catch {
    // Sin almacenamiento: nada que limpiar.
  }
}
