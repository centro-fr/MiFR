import type { PerfilUsuario, SesionActiva } from "../types/usuario";

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

export async function obtenerPerfil(token: string): Promise<PerfilUsuario> {
  const res = await fetch("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al obtener perfil");
  return data as PerfilUsuario;
}

export async function cerrarSesion(token: string): Promise<void> {
  const res = await fetch("/api/v1/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error?.message ?? "Error al cerrar sesión");
  }
}
