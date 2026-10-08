import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  horarioApiSchema,
  horarioConAdvertenciaApiSchema,
  profesoraApiSchema,
  type GuardarHorarioBody,
  type HorarioApi,
} from "@/features/horarios/schemas/horario";

export interface ProfesoraDatos {
  id: string;
  nombre: string;
  apellido: string;
}

// Solo devuelve profesoras activas. El nombre viene del usuario asociado.
export async function listarProfesoras(): Promise<ProfesoraDatos[]> {
  const { data } = await apiClient.get("/profesoras");
  return z
    .array(profesoraApiSchema)
    .parse(data)
    .map((profesora) => ({
      id: String(profesora.id_profesora),
      nombre: profesora.usuario.nombre,
      apellido: profesora.usuario.apellido,
    }));
}

// Solo devuelve horarios activos, ordenados por día y hora.
export async function listarHorarios(): Promise<HorarioApi[]> {
  const { data } = await apiClient.get("/horarios");
  return z.array(horarioApiSchema).parse(data);
}

export async function crearHorario(cuerpo: GuardarHorarioBody): Promise<HorarioApi> {
  const { data } = await apiClient.post("/horarios", cuerpo);
  return horarioApiSchema.parse(data);
}

export async function actualizarHorario(id: string, cambios: Partial<GuardarHorarioBody>): Promise<HorarioApi> {
  const { data } = await apiClient.patch(`/horarios/${id}`, cambios);
  return horarioApiSchema.parse(data);
}

// Baja lógica. Devuelve la advertencia del back (hoy: que no se verificaron inscripciones).
export async function darDeBajaHorario(id: string): Promise<string> {
  const { data } = await apiClient.delete(`/horarios/${id}`);
  return horarioConAdvertenciaApiSchema.parse(data).advertencia;
}
