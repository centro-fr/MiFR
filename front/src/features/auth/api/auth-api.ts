import { apiClient } from "@/api/client";
import { normalizeSession } from "@/features/auth/schemas/auth";
import { setSessionToken } from "@/features/auth/api/session-token";
import type { AuthResponse, AuthUser } from "@/types/auth";

export async function postGoogleLogin(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/google", { id_token: idToken });
  const session = normalizeSession(data);
  setSessionToken(session.token);
  return session;
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await apiClient.get("/auth/me");
  return normalizeSession(data).usuario;
}

export async function postLogout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
