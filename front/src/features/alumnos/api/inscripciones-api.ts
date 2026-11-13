import { apiClient } from "@/api/client";
import { cambioPlanProgramadoApiSchema } from "@/features/alumnos/schemas/alumno";
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

/** null si el cambio se aplicó en el momento; si no, el día ("AAAA-MM-DD") en que se aplica. */
export type ResultadoCambioPlan = { programadoPara: string | null };

// Cambio de plan (US-14): sin plan vigente el back cierra la inscripción y abre otra en el mismo estado
// (200); con el plan vigente lo programa para el día siguiente al último de gracia (202).
export async function cambiarPlan(idInscripcion: number, cuerpo: CambioDePlanBody): Promise<ResultadoCambioPlan> {
  const { status, data } = await apiClient.post(`/inscripciones/${idInscripcion}/cambio-plan`, cuerpo);
  if (status !== 202) return { programadoPara: null };
  return { programadoPara: cambioPlanProgramadoApiSchema.parse(data).fecha_aplicacion.slice(0, 10) };
}

export async function cancelarCambioPlan(idInscripcion: number): Promise<void> {
  await apiClient.delete(`/inscripciones/${idInscripcion}/cambio-plan`);
}
