export type EstadoInscripcion = "PREINSCRIPTA" | "ACTIVA" | "BAJA";

export interface CrearInscripcionPayload {
  id_alumno: number;
  id_plan: number;
  id_profesora: number;
  ids_horarios: number[];
  sin_cargo?: boolean;
  fecha_inicio?: string;
  fecha_fin_estimado?: string | null;
  observaciones?: string | null;
  /** US-05: obligatorias si alguna actividad de los horarios las requiere. */
  medidas?: { peso_kg: number; talla_cm: number };
}

export interface Inscripcion {
  id_inscripcion: number;
  id_alumno: number;
  id_plan: number;
  id_plan_precio: number;
  id_profesora: number;
  estado: EstadoInscripcion;
  fecha_inscripcion: string;
  fecha_inicio: string;
  fecha_fin_estimado: string | null;
  fecha_baja: string | null;
  sin_cargo: boolean;
  observaciones: string | null;
  alumno?: {
    id_alumno: number;
    estado: string;
    usuario: { nombre: string; apellido: string };
  };
  plan?: {
    id_plan: number;
    nombre: string;
    tipo: string;
    clases_por_semana: number | null;
  };
  profesora?: {
    id_profesora: number;
    usuario: { nombre: string; apellido: string };
  };
}
