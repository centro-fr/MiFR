import type {
  asistencias,
  estado_alumno,
  estado_seguimiento_inactividad,
  seguimientos_inactividad,
} from "@prisma/client";

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

// US-30, US-31 y US-33: qué marcas cuentan. Siempre clases cerradas (DICTADA) entre desde y hasta,
// inclusive: las canceladas no tienen marcas y las abiertas todavía pueden cambiar.
export interface FiltroAsistenciasDictadas {
  desde: Date;
  hasta: Date;
  id_alumno?: number;
  // La que dictó la clase: en una suplencia, la suplente (US-24).
  id_profesora?: number;
  id_actividad?: number;
  // Sin esto, los alumnos dados de baja no figuran (US-30, US-33).
  incluir_bajas?: boolean;
}

// Las previstas son las marcas, presentes y ausentes: el cierre registra como ausente a cada
// inscripto sin marcar (US-21).
export interface AsistenciaDeAlumno {
  id_alumno: number;
  id_usuario: number;
  id_usuario_responsable: number | null;
  nombre: string;
  apellido: string;
  estado: estado_alumno;
  clases_previstas: number;
  clases_asistidas: number;
}

export interface AsistenciaDeProfesora {
  id_profesora: number;
  nombre: string;
  apellido: string;
  clases_dictadas: number;
  alumnos: number;
  clases_previstas: number;
  clases_asistidas: number;
}

// Una marca de una clase dictada del historial del alumno (US-10, US-29): qué clase, en qué horario,
// de qué actividad, quién la dictó y si fue.
export interface MarcaDelAlumno {
  id_clase: number;
  // La inscripción con la que asistió: con varios planes, dice de cuál es la clase.
  id_inscripcion: number;
  fecha_clase: Date;
  hora_inicio: Date;
  hora_fin: Date;
  actividad: string;
  profesora: { nombre: string; apellido: string };
  asistio: boolean;
  observaciones: string | null;
}

export interface ConsultaHistorialAlumno {
  // Sin valor, presentes y ausentes.
  asistio?: boolean;
  limit: number;
  offset: number;
}

// total es el de lo filtrado; presentes y ausentes, los de todo el historial.
export interface HistorialDelAlumno {
  datos: MarcaDelAlumno[];
  total: number;
  presentes: number;
  ausentes: number;
}
