import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  registroAsistenciaAlumnoSchema,
  type RegistroAsistenciaAlumno,
} from "../schemas/asistencia-alumno";

export async function listarAsistenciasAlumno(idAlumno: number): Promise<RegistroAsistenciaAlumno[]> {
  try {
    const { data } = await apiClient.get(`/alumnos/${idAlumno}/asistencias`);
    return z.array(registroAsistenciaAlumnoSchema).parse(data);
  } catch {
    // Si la API aún no tiene el endpoint en vivo, retornamos lista vacía sin romper la UI
    return [];
  }
}
