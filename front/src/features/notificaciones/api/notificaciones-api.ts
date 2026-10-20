import { z } from "zod";
import { apiClient } from "@/api/client";
import { parametroSchema, type Parametro } from "@/features/notificaciones/schemas/parametros";
import { resumenDiarioSchema, type ResumenDiario } from "@/features/notificaciones/schemas/resumen-diario";

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
