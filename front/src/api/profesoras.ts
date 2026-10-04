import type { CrearProfesoraInput, Profesora } from "../types/profesora";

export async function listarProfesoras(token: string): Promise<Profesora[]> {
  const res = await fetch("/api/v1/profesoras", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al listar profesoras");
  return data as Profesora[];
}

export async function crearProfesora(token: string, input: CrearProfesoraInput): Promise<Profesora> {
  const res = await fetch("/api/v1/profesoras", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al crear perfil de profesora");
  return data as Profesora;
}

export async function eliminarProfesora(token: string, id: number): Promise<Profesora> {
  const res = await fetch(`/api/v1/profesoras/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Error al dar de baja profesora");
  return data as Profesora;
}
