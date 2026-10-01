// JWT de sesión: memoria + persistencia en localStorage para sobrevivir
// recargas (SDD tasks 4.2: al recargar con sesión iniciada, seguir logueado).
// Nota: un refresh con cookie httpOnly sería más seguro ante XSS; el back
// actual no lo implementa, así que se persiste el Bearer en el navegador.
const STORAGE_KEY = "mifr:session-token";

let sessionToken: string | null = null;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
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
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Sin almacenamiento (modo privado): la sesión vive solo en memoria.
  }
}

export function clearSessionToken(): void {
  sessionToken = null;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: nada que limpiar.
  }
}
