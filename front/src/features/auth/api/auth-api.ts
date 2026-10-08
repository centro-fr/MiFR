import { apiClient } from "@/api/client";
import { normalizeSession } from "@/features/auth/schemas/auth";
import { setSessionToken } from "@/features/auth/api/session-token";
import type { AuthResponse, AuthUser } from "@/types/auth";

async function abrirSesion(ruta: string, cuerpo: Record<string, string>): Promise<AuthResponse> {
  const { data } = await apiClient.post(ruta, cuerpo);
  const session = normalizeSession(data);
  setSessionToken(session.token);
  return session;
}

export function postGoogleLogin(idToken: string): Promise<AuthResponse> {
  return abrirSesion("/auth/google", { id_token: idToken });
}

// Solo existe en el back con LOGIN_DESARROLLO=true: entra con el email, sin Google.
export function postLoginDesarrollo(email: string): Promise<AuthResponse> {
  return abrirSesion("/auth/desarrollo", { email });
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get("/auth/me");
  return normalizeSession(data).usuario;
}

export async function postLogout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
