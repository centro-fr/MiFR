import { apiClient } from "@/api/client";
import type { Alumno, CrearAlumnoPayload, PaginaAlumnos } from "@/types/alumno";

export interface FiltroListarAlumnos {
  busqueda?: string;
  dni?: string;
  estado?: "ACTIVO" | "INACTIVO" | "BAJA";
  limit?: number;
  offset?: number;
  incluirBajas?: boolean;
}

export async function listarAlumnos(filtros?: FiltroListarAlumnos): Promise<PaginaAlumnos> {
  const { data } = await apiClient.get<PaginaAlumnos>("/alumnos", {
    params: filtros,
  });
  return data;
}

export async function obtenerAlumno(id: number): Promise<Alumno> {
  const { data } = await apiClient.get<Alumno>(`/alumnos/${id}`);
  return data;
}

export async function crearAlumno(cuerpo: CrearAlumnoPayload): Promise<Alumno> {
  const { data } = await apiClient.post<Alumno>("/alumnos", cuerpo);
  return data;
}
