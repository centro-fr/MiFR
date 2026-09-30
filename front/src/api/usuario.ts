import type { SesionActiva } from "../types/usuario";

// Ruta relativa: la petición va al Servidor Web (front), que la reenvía al back.
export async function iniciarSesionConGoogle(idToken: string): Promise<SesionActiva> {
  const res = await fetch("/api/v1/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al loguear");
  return data as SesionActiva;
}
