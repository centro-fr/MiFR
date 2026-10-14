import type { ProfesoraDatos } from "@/features/horarios/api/horarios-api";
import type { HorarioApi } from "@/features/horarios/schemas/horario";
import type { PlanApiRespuesta } from "@/types/plan";

// Qué profesoras y horarios corresponden a un plan en la pre-inscripción (US-05). Replica las
// reglas de validarHorarios del back (inscripcion.service.ts): todos los horarios son de una misma
// profesora y de una única actividad (regla del Estudio Inicial).

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

export interface GrupoHorariosActividad {
  id_actividad: number;
  nombre: string;
  modalidad?: string;
  requiere_medidas?: boolean;
  horarios: HorarioApi[];
  /** Indica si la actividad cuenta con suficientes horarios para la frecuencia del plan. */
  viable: boolean;
}

/**
 * Agrupa los horarios permitidos de una profesora por actividad y calcula su viabilidad para el plan.
 */
export function agruparHorariosPorActividad(
  horarios: HorarioApi[],
  plan: ReglasDelPlan | null,
  idProfesora: number | null,
): GrupoHorariosActividad[] {
  const permitidos = horariosDelPlan(horarios, plan, idProfesora);
  const requeridas = clasesRequeridasDelPlan(plan);
  const mapa = new Map<number, GrupoHorariosActividad>();

  for (const h of permitidos) {
    let grupo = mapa.get(h.id_actividad);
    if (!grupo) {
      grupo = {
        id_actividad: h.id_actividad,
        nombre: h.actividad.nombre,
        modalidad: h.actividad.modalidad,
        requiere_medidas: h.actividad.requiere_medidas,
        horarios: [],
        viable: false,
      };
      mapa.set(h.id_actividad, grupo);
    }
    grupo.horarios.push(h);
  }

  // Ordenar horarios dentro de cada grupo por día y hora
  for (const grupo of mapa.values()) {
    grupo.horarios.sort((a, b) => {
      if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
      return a.hora_inicio.localeCompare(b.hora_inicio);
    });
    grupo.viable = grupo.horarios.length >= requeridas;
  }

  return Array.from(mapa.values());
}

/**
 * Profesoras con horarios suficientes para completar las clases semanales del plan en AL MENOS UNA actividad.
 * Según el Estudio Inicial, cada plan corresponde a UNA única actividad: no se pueden sumar clases
 * de disciplinas distintas (ej: 1 de Pilates + 1 de Funcional para un plan de 2 días).
 */
export function profesorasDelPlan(profesoras: ProfesoraDatos[], horarios: HorarioApi[], plan: ReglasDelPlan | null): ProfesoraDatos[] {
  if (!plan) return [];
  const requeridas = clasesRequeridasDelPlan(plan);
  return profesoras.filter((profesora) => {
    const idProf = Number(profesora.id);
    const grupos = agruparHorariosPorActividad(horarios, plan, idProf);
    return grupos.some((g) => g.horarios.length >= requeridas);
  });
}
