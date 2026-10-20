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
    activo: api.activo,
    requiereMedidas: api.requiere_medidas ?? false,
  };
}

function normalizarCodigo(nombre: string): string {
  const limpio = nombre
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return limpio.slice(0, 20) || "ACTIVIDAD";
}

function aCuerpo(datos: ActividadFormData): ActualizarActividadBody {
  return {
    nombre: datos.nombre,
    // El back acepta null o string vacío en la descripción; textoOpcionalSchema lo normaliza a null.
    descripcion: datos.descripcion?.trim() || undefined,
    modalidad: datos.modalidad,
    cupo_maximo: datos.cupoMaximo,
    requiere_medidas: datos.requiereMedidas,
  };
}

// GET /actividades devuelve solo las activas.
export async function listarActividades(): Promise<Actividad[]> {
  const { data } = await apiClient.get("/actividades");
  return z.array(actividadApiSchema).parse(data).map(aActividad);
}

export async function crearActividad(datos: ActividadFormData): Promise<Actividad> {
  const codigoFinal = datos.codigo?.trim() || normalizarCodigo(datos.nombre);
  const cuerpo: CrearActividadBody = { codigo: codigoFinal, ...aCuerpo(datos) };
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
