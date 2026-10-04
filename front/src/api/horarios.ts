import type { ActualizarHorarioInput, CrearHorarioInput, Horario } from "../types/horario";

export async function listarHorarios(
  token: string,
  filtros?: { id_actividad?: number; id_profesora?: number },
): Promise<Horario[]> {
  const url = new URL("/api/v1/horarios", window.location.origin);
  if (filtros?.id_actividad) url.searchParams.set("id_actividad", String(filtros.id_actividad));
  if (filtros?.id_profesora) url.searchParams.set("id_profesora", String(filtros.id_profesora));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al listar horarios");
  return data as Horario[];
}

export async function crearHorario(token: string, input: CrearHorarioInput): Promise<Horario> {
  const res = await fetch("/api/v1/horarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al crear horario");
  return data as Horario;
}

export async function actualizarHorario(
  token: string,
  id: number,
  input: ActualizarHorarioInput,
): Promise<Horario> {
  const res = await fetch(`/api/v1/horarios/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al actualizar horario");
  return data as Horario;
}

export async function eliminarHorario(
  token: string,
  id: number,
): Promise<{ horario: Horario; advertencia: string }> {
  const res = await fetch(`/api/v1/horarios/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al dar de baja horario");
  return data as { horario: Horario; advertencia: string };
}
