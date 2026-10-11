import type { DiaSemana } from "@/types/horarios";

// Ficha del alumno como la usa la interfaz. Sale de FichaAlumnoApi (features/alumnos/schemas).
// Cada campo corresponde a una columna del DER: los que admiten NULL llegan como null.

export type EstadoAlumno = "ACTIVO" | "INACTIVO" | "BAJA";

export type MotivoBaja = "ABANDONO" | "MUDANZA" | "SALUD" | "ECONOMICO" | "OTRO";

export interface ResponsableAlumno {
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
}

export interface FichaAlumno {
  id: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  /** Fecha calendario "AAAA-MM-DD". */
  fechaNacimiento: string;
  direccion: string | null;
  estado: EstadoAlumno;
  /** Timestamp ISO del alta del alumno. */
  fechaAlta: string;
  /** Timestamp ISO de la baja; null si no está de baja. */
  fechaBaja: string | null;
  contactoEmergencia: { nombre: string | null; telefono: string | null };
  aptoMedico: boolean;
  /** Fecha calendario "AAAA-MM-DD". */
  fechaAptoMedico: string | null;
  observaciones: string | null;
  /** Tutor a cargo; solo los menores tienen uno. */
  responsable: ResponsableAlumno | null;
}

// Reactivación (US-08): lo que se elige para volver a inscribir a un alumno dado de baja.

export interface PlanReactivacion {
  id: string;
  nombre: string;
  /** null = pase libre, sin tope de horarios. */
  clasesPorSemana: number | null;
  /** Si el plan es de una sola actividad, sus horarios tienen que ser de esa. */
  idActividadExclusiva: string | null;
  /** null si el plan todavía no tiene un precio vigente. */
  precio: number | null;
}

export interface HorarioElegible {
  id: string;
  idProfesora: string;
  idActividad: string;
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  actividad: string;
}

/** Plan, profesora y horarios de la última inscripción dada de baja. */
export interface InscripcionAnterior {
  idPlan: string;
  idProfesora: string;
  idsHorarios: string[];
}
