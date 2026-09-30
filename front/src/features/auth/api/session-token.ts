// JWT de sesión en memoria del módulo. No se persiste en localStorage:
// si se recarga la página, la sesión se restaura vía GET /auth/me solo cuando
// el back usa cookie httpOnly; con Bearer en memoria, recargar cierra sesión.
let sessionToken: string | null = null;

export function getSessionToken(): string | null {
  return sessionToken;
}

export function setSessionToken(token: string): void {
  sessionToken = token;
}

export function clearSessionToken(): void {
  sessionToken = null;
}
