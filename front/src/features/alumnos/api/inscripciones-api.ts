import { apiClient } from "@/api/client";
import type { CrearInscripcionPayload, Inscripcion } from "@/types/inscripcion";

export interface FiltroListarInscripciones {
  id_alumno?: number;
  id_plan?: number;
  id_profesora?: number;
  id_actividad?: number;
  estado?: "PREINSCRIPTA" | "ACTIVA" | "BAJA";
}

export async function crearInscripcion(cuerpo: CrearInscripcionPayload): Promise<Inscripcion> {
  const { data } = await apiClient.post<Inscripcion>("/inscripciones", cuerpo);
  return data;
}

export async function listarInscripciones(filtros?: FiltroListarInscripciones): Promise<Inscripcion[]> {
  const { data } = await apiClient.get<Inscripcion[]>("/inscripciones", {
    params: filtros,
  });
  return data;
}
