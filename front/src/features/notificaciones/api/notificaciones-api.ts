import { z } from "zod";
import { apiClient } from "@/api/client";
import {
  notificacionesMarcadasSchema,
  notificacionSchema,
  paginaNotificacionesSchema,
  type Notificacion,
  type PaginaNotificaciones,
} from "@/features/notificaciones/schemas/notificaciones";
import { parametroSchema, type Parametro } from "@/features/notificaciones/schemas/parametros";
import { resumenDiarioSchema, type ResumenDiario } from "@/features/notificaciones/schemas/resumen-diario";

/** Las de quien pide: primero las no leídas y, en cada grupo, de la más nueva a la más vieja. */
export async function listarMisNotificaciones(paginacion: { limit: number; offset: number }): Promise<PaginaNotificaciones> {
  const { data } = await apiClient.get("/notificaciones/mias", { params: paginacion });
  return paginaNotificacionesSchema.parse(data);
}

/** 404 si no existe o es de otra persona. */
export async function marcarNotificacionLeida(idNotificacion: number): Promise<Notificacion> {
  const { data } = await apiClient.post(`/notificaciones/${idNotificacion}/leida`);
  return notificacionSchema.parse(data);
}

/** Devuelve cuántas estaban sin leer. */
export async function marcarTodasLeidas(): Promise<number> {
  const { data } = await apiClient.post("/notificaciones/leidas");
  return notificacionesMarcadasSchema.parse(data).marcadas;
}

/** Lo pendiente del día (US-26). El back lo calcula al pedirlo; solo para la propietaria. */
export async function obtenerResumenDiario(): Promise<ResumenDiario> {
  const { data } = await apiClient.get("/resumen-diario");
  return resumenDiarioSchema.parse(data);
}

/** Todos los parámetros, también los que todavía tienen su valor inicial. */
export async function listarParametros(): Promise<Parametro[]> {
  const { data } = await apiClient.get("/parametros");
  return z.array(parametroSchema).parse(data);
}

/** 400 si el valor no es del tipo o del rango de la clave. */
export async function actualizarParametro(clave: string, valor: number | string): Promise<Parametro> {
  const { data } = await apiClient.patch(`/parametros/${encodeURIComponent(clave)}`, { valor });
  return parametroSchema.parse(data);
}
