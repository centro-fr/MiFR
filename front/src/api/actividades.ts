import type { Actividad, ActualizarActividadInput, CrearActividadInput } from "../types/actividad";

export async function listarActividades(token: string, busqueda?: string): Promise<Actividad[]> {
  const url = new URL("/api/v1/actividades", window.location.origin);
  if (busqueda?.trim()) {
    url.searchParams.set("busqueda", busqueda.trim());
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al listar actividades");
  return data as Actividad[];
}

export async function crearActividad(token: string, input: CrearActividadInput): Promise<Actividad> {
  const res = await fetch("/api/v1/actividades", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al crear actividad");
  return data as Actividad;
}

export async function actualizarActividad(
  token: string,
  id: number,
  input: ActualizarActividadInput,
): Promise<Actividad> {
  const res = await fetch(`/api/v1/actividades/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al actualizar actividad");
  return data as Actividad;
}

export async function eliminarActividad(token: string, id: number): Promise<Actividad> {
  const res = await fetch(`/api/v1/actividades/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al dar de baja actividad");
  return data as Actividad;
}
