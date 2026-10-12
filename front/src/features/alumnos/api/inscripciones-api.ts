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

// Mismo plan y profesora, otros horarios: solo la propietaria. El back vuelve a validar el cupo.
export async function actualizarHorarios(idInscripcion: number, idsHorarios: number[]): Promise<void> {
  await apiClient.patch(`/inscripciones/${idInscripcion}/horarios`, { ids_horarios: idsHorarios });
}

export interface CambioDePlanBody {
  id_plan: number;
  id_profesora: number;
  ids_horarios: number[];
}

// Cambio de plan (US-14): el back cierra la inscripción actual y abre otra en el mismo estado.
export async function cambiarPlan(idInscripcion: number, cuerpo: CambioDePlanBody): Promise<void> {
  await apiClient.post(`/inscripciones/${idInscripcion}/cambio-plan`, cuerpo);
}
