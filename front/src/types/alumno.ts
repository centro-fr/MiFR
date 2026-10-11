export type EstadoAlumno = "ACTIVO" | "INACTIVO" | "BAJA";

export interface DatosPersonales {
  id_usuario: number;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  fecha_nacimiento: string;
  direccion: string | null;
  estado: "ACTIVO" | "INACTIVO" | "BLOQUEADO";
}

export interface Alumno {
  id_alumno: number;
  id_usuario: number;
  id_responsable_menor: number | null;
  cont_emerg_nombre: string | null;
  cont_emerg_telefono: string | null;
  apto_medico: boolean;
  fecha_apto_medico: string | null;
  observaciones: string | null;
  estado: EstadoAlumno;
  usuario: DatosPersonales;
  responsable: DatosPersonales | null;
  plan?: {
    id_plan: number;
    nombre: string;
    tipo?: string;
  } | null;
  estado_cuota?: "AL_DIA" | "POR_VENCER" | "VENCIDA" | null;
}

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

export interface PaginaAlumnos {
  datos: Alumno[];
  total: number;
  limit: number;
  offset: number;
}
