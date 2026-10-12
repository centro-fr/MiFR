import type { DiaSemana } from "@/types/horarios";

// Tipos de alumnos que comparten varias pantallas. El listado y la ficha usan los modelos de
// features/alumnos/schemas/alumno.ts, que salen del contrato del back.

export type MotivoBaja = "ABANDONO" | "MUDANZA" | "SALUD" | "ECONOMICO" | "OTRO";

// ---------- Alta (US-05): cuerpo de POST /alumnos (crearAlumnoSchema del back) ----------

export interface TutorNuevoInput {
  nombre: string;
  apellido: string;
  dni?: string;
  telefono: string;
  email: string;
  fecha_nacimiento: string;
}

export interface CrearAlumnoPayload {
  nombre: string;
  apellido: string;
  email?: string;
  fecha_nacimiento: string;
  dni?: string;
  telefono?: string | null;
  direccion?: string | null;
  cont_emerg_nombre?: string | null;
  cont_emerg_telefono?: string | null;
  apto_medico: boolean;
  fecha_apto_medico?: string | null;
  observaciones?: string | null;
  tutor?: { id_usuario: number } | TutorNuevoInput;
}

// ---------- Reactivación y cambio de plan (US-08): lo que se elige para inscribir ----------

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

/** Plan, profesora y horarios de una inscripción: la anterior a la baja o la actual. */
export interface InscripcionAnterior {
  idPlan: string;
  idProfesora: string;
  idsHorarios: string[];
}
