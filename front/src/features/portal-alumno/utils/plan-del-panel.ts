import type { PanelAlumno, PlanDelAlumno } from "../schemas/panel-alumno";

const PRIORIDAD_CUOTA: Record<PlanDelAlumno["estado_cuota"], number> = {
  VENCIDA: 0,
  EN_GRACIA: 1,
  AL_DIA: 2,
};

/** Menor número = cuota más urgente (VENCIDA > EN_GRACIA > AL_DIA). */
export function urgenciaDeCuota(plan: PlanDelAlumno): number {
  return PRIORIDAD_CUOTA[plan.estado_cuota];
}

/**
 * El plan a mostrar: el elegido si sigue vigente; si no, el de cuota más urgente
 * (y a igual urgencia, el que vence antes).
 */
export function planAMostrar(planes: PlanDelAlumno[], idElegido?: number): PlanDelAlumno | undefined {
  if (planes.length === 0) return undefined;
  const encontrado = idElegido ? planes.find((p) => p.id_inscripcion === idElegido) : undefined;
  if (encontrado) return encontrado;
  return [...planes].sort(
    (a, b) => urgenciaDeCuota(a) - urgenciaDeCuota(b) || a.fecha_vencimiento.localeCompare(b.fecha_vencimiento),
  )[0];
}

export interface VistaDelPlan {
  plan: PlanDelAlumno | undefined;
  proximas_clases: PanelAlumno["proximas_clases"];
  historial_asistencias: PanelAlumno["historial_asistencias"];
}

/** Recorta las próximas clases y el historial de asistencias al plan elegido. */
export function vistaDelPlan(panel: PanelAlumno, idInscripcion?: number): VistaDelPlan {
  const plan = planAMostrar(panel.planes, idInscripcion);
  if (!plan) {
    return {
      plan: undefined,
      proximas_clases: panel.proximas_clases,
      historial_asistencias: panel.historial_asistencias,
    };
  }
  return {
    plan,
    proximas_clases: panel.proximas_clases.filter((c) => c.id_inscripcion === plan.id_inscripcion),
    historial_asistencias: panel.historial_asistencias.filter((h) => h.id_inscripcion === plan.id_inscripcion),
  };
}

/** Título corto del plan para el selector: sus actividades o, si no tiene, el nombre del plan. */
export function etiquetaDelPlan(plan: PlanDelAlumno): string {
  return plan.actividades.length > 0 ? plan.actividades.join(" + ") : plan.nombre;
}

/** Indica si algún otro plan (distinto al elegido) tiene cuota por vencer o vencida. */
export function hayOtroPlanConAlerta(planes: PlanDelAlumno[], idElegido?: number): boolean {
  return planes.some(
    (p) => p.id_inscripcion !== idElegido && (p.estado_cuota === "VENCIDA" || p.estado_cuota === "EN_GRACIA"),
  );
}

