import type { asistencias } from "@prisma/client";

export type Asistencia = asistencias;
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
}
