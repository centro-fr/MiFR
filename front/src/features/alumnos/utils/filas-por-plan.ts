import type { AlumnoResumen, InscripcionEnListado } from "@/features/alumnos/schemas/alumno";
import { compararAlumnosPorCuota } from "@/features/alumnos/utils/situacion-cuota";

// Listado de alumnos por plan: quien tiene dos planes vigentes figura dos veces, cada fila con el
// plan, la profesora y la cuota de esa inscripción, para cobrarlas y seguirlas por separado.

export interface FiltroDeFilas {
  id_plan: string;
  id_profesora: string;
}

/** Clave estable de la fila: un mismo alumno aparece una vez por inscripción. */
export function claveDeFila(alumno: Pick<AlumnoResumen, "id_alumno" | "id_inscripcion">): string {
  return `${alumno.id_alumno}-${alumno.id_inscripcion ?? "sin-inscripcion"}`;
}

// El back filtra alumnos, no inscripciones: con un filtro por plan o profesora, al alumno que
// coincide en uno de sus planes se le muestra solo ese.
function coincideConElFiltro(inscripcion: InscripcionEnListado, filtro: FiltroDeFilas): boolean {
  if (filtro.id_plan && String(inscripcion.id_plan) !== filtro.id_plan) return false;
  if (filtro.id_profesora && String(inscripcion.id_profesora) !== filtro.id_profesora) return false;
  return true;
}

function filaDeLaInscripcion(alumno: AlumnoResumen, inscripcion: InscripcionEnListado): AlumnoResumen {
  return {
    ...alumno,
    id_inscripcion: inscripcion.id_inscripcion,
    plan: inscripcion.plan,
    profesora: inscripcion.profesora,
    situacion_cuota: inscripcion.situacion_cuota,
    cambio_programado: inscripcion.cambio_programado ?? null,
  };
}

function filasDelAlumno(alumno: AlumnoResumen, filtro: FiltroDeFilas): AlumnoResumen[] {
  const inscripciones = alumno.inscripciones ?? [];
  if (inscripciones.length < 2) return [alumno];
  const coinciden = inscripciones.filter((inscripcion) => coincideConElFiltro(inscripcion, filtro));
  // Si el filtro no reconoce ninguna (el back lo aplicó con otro criterio, como la actividad), se
  // muestran todas antes que esconder al alumno.
  const visibles = coinciden.length > 0 ? coinciden : inscripciones;
  return visibles.map((inscripcion) => filaDeLaInscripcion(alumno, inscripcion));
}

/**
 * Una fila por inscripción vigente. Se reordena por cuota antes de paginar porque la de cada plan
 * puede no ser la que ordenó al alumno; las filas de un mismo alumno conservan su orden.
 */
export function unaFilaPorPlan(alumnos: AlumnoResumen[], filtro: FiltroDeFilas): AlumnoResumen[] {
  return alumnos.flatMap((alumno) => filasDelAlumno(alumno, filtro)).sort(compararAlumnosPorCuota);
}
