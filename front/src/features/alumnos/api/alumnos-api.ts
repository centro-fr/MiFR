import { apiClient } from "@/api/client";
import {
  actualizarAlumnoSchema,
  alumnoDetalleSchema,
  respuestaAlumnosSchema,
  type ActualizarAlumnoInput,
  type AlumnoDetalle,
  type RespuestaAlumnos,
} from "@/features/alumnos/schemas/alumno";

export interface FiltrosAlumnos {
  q: string;
  estado: string;
  id_plan: string;
  id_profesora: string;
  id_actividad: string;
  estado_cuota: string;
  incluir_bajas: boolean;
  limit: number;
  offset: number;
}

// Ruta prevista en el SDD de Alumnos e Inscripciones; hasta que exista el módulo backend,
// estas llamadas funcionan con los handlers MSW del front.
export async function listarAlumnos(filtros: FiltrosAlumnos): Promise<RespuestaAlumnos> {
  const params = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== ""));
  const { data } = await apiClient.get("/alumnos", { params });
  return respuestaAlumnosSchema.parse(data);
}

export async function obtenerAlumno(id: number): Promise<AlumnoDetalle> {
  const { data } = await apiClient.get(`/alumnos/${id}`);
  return alumnoDetalleSchema.parse(data);
}

export async function actualizarAlumno(id: number, cambios: ActualizarAlumnoInput): Promise<AlumnoDetalle> {
  const cuerpo = actualizarAlumnoSchema.parse(cambios);
  const { data } = await apiClient.put(`/alumnos/${id}`, cuerpo);
  return alumnoDetalleSchema.parse(data);
}
