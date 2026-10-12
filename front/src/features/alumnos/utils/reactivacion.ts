import type { ReactivacionFormValues } from "@/features/alumnos/schemas/reactivacion";
import { textoHorarios } from "@/features/alumnos/utils/pendientes-de-alta";
import { numeroDeDia } from "@/features/horarios/utils/cronograma";
import type { HorarioElegible, InscripcionAnterior, PlanReactivacion } from "@/types/alumno";

// Lógica del formulario de reactivación (US-08). Funciones puras: se testean sin render.
// Replica las reglas de validarHorarios del back (inscripcion.service.ts) que se pueden ver antes
// de enviar; el cupo solo lo sabe el back y llega como 409.

export const VALORES_VACIOS: ReactivacionFormValues = { idPlan: "", idProfesora: "", idsHorarios: [] };

function enOrdenDeSemana(a: HorarioElegible, b: HorarioElegible): number {
  return numeroDeDia(a.dia) - numeroDeDia(b.dia) || a.horaInicio.localeCompare(b.horaInicio);
}

/** Horarios de la profesora elegida y, si el plan es de una sola actividad, de esa actividad. */
export function horariosElegibles(
  horarios: HorarioElegible[],
  plan: PlanReactivacion | undefined,
  idProfesora: string,
): HorarioElegible[] {
  if (!plan || !idProfesora) return [];
  return horarios
    .filter((horario) => horario.idProfesora === idProfesora)
    .filter((horario) => plan.idActividadExclusiva === null || horario.idActividad === plan.idActividadExclusiva)
    .sort(enOrdenDeSemana);
}

/** Deja elegidos solo los horarios que siguen siendo válidos para el plan y la profesora. */
export function ajustarSeleccion(
  valores: ReactivacionFormValues,
  planes: PlanReactivacion[],
  horarios: HorarioElegible[],
): ReactivacionFormValues {
  const plan = planes.find(({ id }) => id === valores.idPlan);
  const validos = new Set(horariosElegibles(horarios, plan, valores.idProfesora).map(({ id }) => id));
  return { ...valores, idsHorarios: valores.idsHorarios.filter((id) => validos.has(id)) };
}

/**
 * Propone lo que el alumno tenía antes de la baja. Si el plan ya no existe, arranca vacío; los
 * horarios dados de baja desde entonces se descartan.
 */
export function valoresIniciales(
  anterior: InscripcionAnterior | null,
  planes: PlanReactivacion[],
  horarios: HorarioElegible[],
): ReactivacionFormValues {
  if (!anterior || !planes.some(({ id }) => id === anterior.idPlan)) return VALORES_VACIOS;
  const propuesta = { idPlan: anterior.idPlan, idProfesora: anterior.idProfesora, idsHorarios: anterior.idsHorarios };
  return ajustarSeleccion(propuesta, planes, horarios);
}

/** "Lun 18:00 a 19:00 · Funcional". */
export function etiquetaHorario(horario: HorarioElegible): string {
  return `${textoHorarios([horario])} · ${horario.actividad}`;
}
