import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  asistenciaDeClaseApiSchema,
  claseDelDiaApiSchema,
  claseApiSchema,
  type AsistenciaDeClaseApi,
  type ClaseDelDiaApi,
} from "@/features/asistencia/schemas/asistencia";

const respuestaMensajeSchema = z.object({ mensaje: z.string() });

export async function listarClasesDeHoy(): Promise<ClaseDelDiaApi[]> {
  const { data } = await apiClient.get("/clases/hoy");
  return z.array(claseDelDiaApiSchema).parse(data);
}

export async function listarClasesDeFecha(fecha: string): Promise<ClaseDelDiaApi[]> {
  const { data } = await apiClient.get("/clases", { params: { fecha } });
  return z.array(claseDelDiaApiSchema).parse(data);
}

export async function obtenerAsistenciaDeClase(idClase: string): Promise<AsistenciaDeClaseApi> {
  const { data } = await apiClient.get(`/clases/${idClase}/asistencia`);
  return asistenciaDeClaseApiSchema.parse(data);
}

export async function marcarAsistencia(
  idClase: string,
  idAlumno: number,
  asistio: boolean,
): Promise<void> {
  const { data } = await apiClient.put(`/clases/${idClase}/asistencia/${idAlumno}`, { asistio });
  respuestaMensajeSchema.parse(data);
}

export async function marcarTodosPresentes(idClase: string): Promise<void> {
  const { data } = await apiClient.post(`/clases/${idClase}/asistencia/todos-presentes`);
  respuestaMensajeSchema.parse(data);
}

export async function cerrarAsistencia(idClase: string): Promise<void> {
  const { data } = await apiClient.post(`/clases/${idClase}/cerrar`);
  claseApiSchema.parse(data);
}
