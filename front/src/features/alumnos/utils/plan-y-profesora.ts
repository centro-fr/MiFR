import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { PlanApiRespuesta } from "@/types/plan";

// Qué profesoras y horarios corresponden a un plan en la pre-inscripción (US-05). Replica las
// reglas de validarHorarios del back (inscripcion.service.ts): todos los horarios son de una misma
// profesora y, si el plan tiene actividad exclusiva, de esa actividad. Un plan "Multi-actividad"
// puede combinar actividades de la profesora (ej: Combat el lunes y HIIT el jueves).

type ReglasDelPlan = Pick<PlanApiRespuesta, "tipo" | "clases_por_semana" | "id_actividad_exclusiva">;

/** Clases por semana que hay que elegir: una para la clase suelta. */
export function clasesRequeridasDelPlan(plan: ReglasDelPlan | null): number {
  if (!plan) return 0;
  if (plan.tipo === "CLASE_SUELTA") return 1;
  return plan.clases_por_semana ?? 1;
}

/** Horarios de la profesora que el plan permite elegir. */
export function horariosDelPlan(horarios: HorarioApi[], plan: ReglasDelPlan | null, idProfesora: number | null): HorarioApi[] {
  if (!plan || idProfesora === null) return [];
  return horarios.filter(
    (horario) =>
      horario.id_profesora === idProfesora &&
      (plan.id_actividad_exclusiva === null || horario.id_actividad === plan.id_actividad_exclusiva),
  );
}

/**
 * Profesoras con horarios suficientes para completar las clases semanales del plan. Una que no
 * da la actividad exclusiva, o que tiene menos horarios de los que el plan pide, no se ofrece:
 * con ella la pre-inscripción quedaría trabada en el paso de horarios.
 */
export function profesorasDelPlan(profesoras: ProfesoraDatos[], horarios: HorarioApi[], plan: ReglasDelPlan | null): ProfesoraDatos[] {
  if (!plan) return [];
  const requeridas = clasesRequeridasDelPlan(plan);
  return profesoras.filter((profesora) => horariosDelPlan(horarios, plan, Number(profesora.id)).length >= requeridas);
}
