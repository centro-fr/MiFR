import type { asistencias, estado_seguimiento_inactividad, seguimientos_inactividad } from "@prisma/client";

export type Asistencia = asistencias;
export type SeguimientoInactividad = seguimientos_inactividad;
export type EstadoSeguimientoInactividad = estado_seguimiento_inactividad;
export type EstadoAsistencia = "sin_marcar" | "presente" | "ausente";

export interface InscriptoConAsistencia {
  id_alumno: number;
  id_inscripcion: number;
  nombre: string;
  apellido: string;
  asistencia: EstadoAsistencia;
  observaciones: string | null;
}

export interface MarcarAsistenciaInput {
  asistio: boolean;
  // undefined: se conservan las que había; null: se borran.
  observaciones?: string | null;
}

// US-22: las inasistencias seguidas de una inscripción en las clases ya cerradas, desde la última a la
// que asistió.
export interface RachaDeInasistencia {
  inasistencias_consecutivas: number;
  // El día de la última clase cerrada a la que asistió; null si nunca asistió.
  fecha_ultima_asistencia: Date | null;
}

export type MarcaDeSeguimiento = Pick<SeguimientoInactividad, "estado" | "fecha_registro">;
