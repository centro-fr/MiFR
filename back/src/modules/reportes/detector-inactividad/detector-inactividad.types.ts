import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { EstadoSeguimientoInactividad } from "../../gestion-inscripciones-y-clases/asistencia/asistencia.types.js";
import type { InscripcionParaInactividad } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";

// PENDIENTE es no tener una marca vigente: no se guarda.
export type EstadoGestionInactividad = "PENDIENTE" | EstadoSeguimientoInactividad;

export interface FiltroAlumnosInactivos extends Paginacion {
  id_profesora?: number;
  id_plan?: number;
  // Más alto que el parámetro INASISTENCIAS_CONSECUTIVAS_INACTIVO; uno más bajo no cambia nada.
  minimo_inasistencias?: number;
  // Sin él no aparecen los IGNORADO (US-22).
  estado_gestion?: EstadoGestionInactividad;
}

interface Contacto {
  nombre: string;
  apellido: string;
  telefono: string | null;
  email: string | null;
}

export interface AlumnoInactivo {
  id_inscripcion: number;
  alumno: Contacto & { id_alumno: number };
  // El que atiende el contacto de un menor (US-06).
  tutor: Contacto | null;
  profesora: InscripcionParaInactividad["profesora"];
  plan: InscripcionParaInactividad["plan"];
  // Siempre al día: los vencidos se gestionan en la cobranza.
  estado_cuota: "AL_DIA" | "POR_VENCER";
  inasistencias_consecutivas: number;
  fecha_ultima_asistencia: Date | null;
  gestion: { estado: EstadoGestionInactividad; fecha_registro: Date | null };
}

export interface PaginaAlumnosInactivos {
  datos: AlumnoInactivo[];
  total: number;
  // El valor de INASISTENCIAS_CONSECUTIVAS_INACTIVO con el que se calculó.
  umbral: number;
  limit: number;
  offset: number;
}
