import { apiClient } from "@/api/client";
import { authResponseSchema } from "@/features/auth/schemas/auth";
import type { AuthResponse } from "@/types/auth";

export async function postGoogleLogin(idToken: string): Promise<AuthResponse> {
  const { data } = await apiClient.post("/auth/google", { idToken });
  return authResponseSchema.parse(data);
}

export async function getMe(): Promise<AuthResponse["usuario"]> {
  const { data } = await apiClient.get("/auth/me");
  return authResponseSchema.shape.usuario.parse(data.usuario ?? data);
}

export async function postLogout(): Promise<void> {
  await apiClient.post("/auth/logout");
}
