import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  inscripcionAnteriorApiSchema,
  planApiSchema,
  type PlanApi,
  type ReactivarAlumnoBody,
} from "@/features/alumnos/schemas/reactivacion";
import { listarHorarios } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import { diaDesdeNumero, horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { HorarioElegible, InscripcionAnterior, PlanReactivacion } from "@/types/alumno";

function aPlan(plan: PlanApi): PlanReactivacion {
  return {
    id: String(plan.id_plan),
    nombre: plan.nombre,
    clasesPorSemana: plan.clases_por_semana,
    idActividadExclusiva: plan.id_actividad_exclusiva === null ? null : String(plan.id_actividad_exclusiva),
    precio: plan.precio_vigente?.precio ?? null,
  };
}

function aHorarioElegible(horario: HorarioApi): HorarioElegible {
  return {
    id: String(horario.id_horario),
    idProfesora: String(horario.id_profesora),
    idActividad: String(horario.id_actividad),
    dia: diaDesdeNumero(horario.dia_semana),
    horaInicio: horaDesdeApi(horario.hora_inicio),
    horaFin: horaDesdeApi(horario.hora_fin),
    actividad: horario.actividad.nombre,
  };
}

// Por defecto el back solo lista los planes vigentes: un plan dado de baja no se ofrece.
export async function listarPlanes(): Promise<PlanReactivacion[]> {
  const { data } = await apiClient.get("/planes");
  return z.array(planApiSchema).parse(data).map(aPlan);
}

// El back rechaza los horarios de una actividad dada de baja: no se ofrecen.
export async function listarHorariosElegibles(): Promise<HorarioElegible[]> {
  const horarios = await listarHorarios();
  return horarios.filter((horario) => horario.actividad.activo).map(aHorarioElegible);
}

/** La más reciente primero (el back ordena por fecha de alta): con limit=1 alcanza. */
export async function obtenerInscripcionAnterior(idAlumno: string): Promise<InscripcionAnterior | null> {
  const { data } = await apiClient.get("/inscripciones", {
    params: { id_alumno: idAlumno, estado: "BAJA", limit: 1 },
  });
  const [ultima] = z.array(inscripcionAnteriorApiSchema).parse(data);
  if (!ultima) return null;
  return {
    idPlan: String(ultima.id_plan),
    idProfesora: String(ultima.id_profesora),
    idsHorarios: ultima.horarios.map(({ id_horario }) => String(id_horario)),
  };
}

// El back crea una inscripción activa y vuelve a validar el cupo: sin lugar responde 409.
export async function reactivarAlumno(idAlumno: string, cuerpo: ReactivarAlumnoBody): Promise<void> {
  await apiClient.post(`/alumnos/${encodeURIComponent(idAlumno)}/reactivar`, cuerpo);
}
