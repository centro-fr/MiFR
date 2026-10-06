import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  actividadApiSchema,
  type ActividadApi,
  type ActividadFormData,
  type ActualizarActividadBody,
  type CrearActividadBody,
} from "@/features/actividades/schemas/actividad";
import type { Actividad } from "@/types/actividad";

export function aActividad(api: ActividadApi): Actividad {
  return {
    id: String(api.id_actividad),
    codigo: api.codigo,
    nombre: api.nombre,
    descripcion: api.descripcion ?? "",
    modalidad: api.modalidad,
    cupoMaximo: api.cupo_maximo,
  };
}

function aCuerpo(datos: ActividadFormData): ActualizarActividadBody {
  return {
    nombre: datos.nombre,
    // El back no acepta null en la descripción: vacía se manda como texto vacío.
    descripcion: datos.descripcion,
    modalidad: datos.modalidad,
    cupo_maximo: datos.cupoMaximo,
  };
}

// GET /actividades devuelve solo las activas.
export async function listarActividades(): Promise<Actividad[]> {
  const { data } = await apiClient.get("/actividades");
  return z.array(actividadApiSchema).parse(data).map(aActividad);
}

export async function crearActividad(datos: ActividadFormData): Promise<Actividad> {
  const cuerpo: CrearActividadBody = { codigo: datos.codigo, ...aCuerpo(datos) };
  const { data } = await apiClient.post("/actividades", cuerpo);
  return aActividad(actividadApiSchema.parse(data));
}

export async function actualizarActividad(id: string, datos: ActividadFormData): Promise<Actividad> {
  const { data } = await apiClient.patch(`/actividades/${id}`, aCuerpo(datos));
  return aActividad(actividadApiSchema.parse(data));
}

// Baja lógica. El back responde 409 si la actividad todavía tiene horarios activos.
export async function darDeBajaActividad(id: string): Promise<void> {
  await apiClient.delete(`/actividades/${id}`);
}
