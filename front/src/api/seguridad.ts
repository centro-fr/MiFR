import type { ActualizarMatrizInput, MatrizPermisos } from "../types/seguridad";

export async function obtenerMatriz(token: string): Promise<MatrizPermisos> {
  const res = await fetch("/api/v1/seguridad/matriz", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al obtener matriz de permisos");
  return data as MatrizPermisos;
}

export async function actualizarMatriz(
  token: string,
  input: ActualizarMatrizInput,
): Promise<{ mensaje: string }> {
  const res = await fetch("/api/v1/seguridad/matriz", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al actualizar matriz de permisos");
  return data as { mensaje: string };
}
