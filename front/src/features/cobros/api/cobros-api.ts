import { isAxiosError } from "axios";
import { apiClient } from "@/api/client";
import {
  comprobantePagoSchema,
  pagoApiSchema,
  type ComprobantePago,
  type PagoApi,
  type RegistrarCobroEfectivoBody,
} from "@/features/cobros/schemas/cobro-efectivo.schema";
import type { Promocion } from "@/types/promocion";
import { z } from "zod";

const CLAVE_CACHE_PAGOS = "mifr_pagos_recientes_sesion";

export const cotizacionCobroSchema = z.object({
  id_plan_precio: z.number().int(),
  precio_lista: z.number(),
  descuento: z.number(),
  monto: z.number(),
  promocion: z
    .object({
      id_promocion: z.number().int(),
      codigo: z.string(),
      nombre: z.string(),
    })
    .nullable(),
});

export type CotizacionCobro = z.infer<typeof cotizacionCobroSchema>;

interface DatosPromocionCobro {
  id: number;
  precioLista: number;
  idPromocion: number | null;
  idPlan: number;
}

function redondearMonto(monto: number): number {
  return Math.round(monto * 100) / 100;
}

export function calcularCotizacionCobro(
  datos: DatosPromocionCobro,
  promociones: Promocion[],
): CotizacionCobro {
  const promocion = datos.idPromocion === null
    ? null
    : promociones.find(
        (item) =>
          item.id === String(datos.idPromocion) &&
          item.activo &&
          item.estado === "ACTIVA" &&
          item.planes.some((plan) => plan.id === String(datos.idPlan)),
      ) ?? null;
  const descuento = promocion
    ? promocion.tipoDescuento === "PORCENTAJE"
      ? redondearMonto(datos.precioLista * promocion.valor / 100)
      : Math.min(datos.precioLista, promocion.valor)
    : 0;
  return {
    id_plan_precio: datos.id,
    precio_lista: datos.precioLista,
    descuento,
    monto: redondearMonto(Math.max(0, datos.precioLista - descuento)),
    promocion: promocion
      ? { id_promocion: Number(promocion.id), codigo: promocion.codigo, nombre: promocion.nombre }
      : null,
  };
}

export function guardarPagoEnCacheLocal(pago: PagoApi): void {
  try {
    const existentes = obtenerPagosDeCacheLocal();
    const sinDuplicados = existentes.filter((p) => p.id_pago !== pago.id_pago);
    sessionStorage.setItem(CLAVE_CACHE_PAGOS, JSON.stringify([pago, ...sinDuplicados]));
  } catch {
    // Si sessionStorage no está disponible o falla, ignorar
  }
}

export function obtenerPagosDeCacheLocal(): PagoApi[] {
  try {
    const raw = sessionStorage.getItem(CLAVE_CACHE_PAGOS);
    if (!raw) return [];
    return JSON.parse(raw) as PagoApi[];
  } catch {
    return [];
  }
}

function filtrarPagosLocales(
  pagos: PagoApi[],
  params?: { id_inscripcion?: number; id_alumno?: number },
): PagoApi[] {
  if (!params?.id_inscripcion && !params?.id_alumno) return pagos;
  return pagos.filter((p) => {
    if (params.id_inscripcion && p.id_inscripcion && p.id_inscripcion !== params.id_inscripcion) {
      return false;
    }
    return true;
  });
}

/**
 * Registra un cobro en efectivo en el sistema (US-15).
 * Genera la cuota y el pago CONFIRMADO en una transacción en el backend.
 * Si quien cobra es una profesora, queda marcado con rendido = false (US-19).
 */
export async function registrarCobroEfectivo(cuerpo: RegistrarCobroEfectivoBody): Promise<PagoApi> {
  const respuesta = await apiClient.post("/pagos/efectivo", cuerpo);
  const pagoParseado = pagoApiSchema.parse(respuesta.data);
  const pagoConInscripcion: PagoApi = {
    ...pagoParseado,
    id_inscripcion: cuerpo.id_inscripcion,
  };
  guardarPagoEnCacheLocal(pagoConInscripcion);
  return pagoConInscripcion;
}

export interface RegistrarCobroTransferenciaRecibidaBody {
  id_inscripcion: number;
  id_promocion?: number;
  monto: number;
  fecha_hora_transferencia: string;
  titular_cuenta_origen?: string;
  confirmar_monto_distinto?: boolean;
}

/**
 * Registra un cobro por transferencia recibido y confirmado por la propietaria.
 */
export async function registrarCobroTransferenciaRecibida(
  cuerpo: RegistrarCobroTransferenciaRecibidaBody,
): Promise<PagoApi> {
  const fechaIso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(cuerpo.fecha_hora_transferencia)
    ? `${cuerpo.fecha_hora_transferencia}:00-03:00`
    : new Date(cuerpo.fecha_hora_transferencia).toISOString();
  const respuesta = await apiClient.post("/pagos/transferencia-recibida", {
    ...cuerpo,
    fecha_hora_transferencia: fechaIso,
  });
  const pagoParseado = pagoApiSchema.parse(respuesta.data);
  const pagoConInscripcion: PagoApi = {
    ...pagoParseado,
    id_inscripcion: cuerpo.id_inscripcion,
  };
  guardarPagoEnCacheLocal(pagoConInscripcion);
  return pagoConInscripcion;
}

/**
 * Obtiene el comprobante digital numerado de un pago confirmado (US-15).
 * El backend valida que el solicitante sea la propietaria, quien cobró, o el alumno/tutor.
 */
export async function obtenerComprobante(idPago: number): Promise<ComprobantePago> {
  const respuesta = await apiClient.get(`/pagos/${idPago}/comprobante`);
  return comprobantePagoSchema.parse(respuesta.data);
}

/**
 * Consulta la lista de pagos, opcionalmente filtrada por alumno o inscripción.
 * Si el backend no expone un endpoint general para /pagos, muestra los pagos
 * confirmados durante la sesión actual para reflejar el historial de cobros y comprobantes.
 */
export async function listarPagos(params?: {
  id_inscripcion?: number;
  id_alumno?: number;
}): Promise<PagoApi[]> {
  try {
    const respuesta = await apiClient.get("/pagos", { params });
    const deApi = z.array(pagoApiSchema).parse(respuesta.data);
    const locales = obtenerPagosDeCacheLocal();
    const mapa = new Map<number, PagoApi>();
    for (const p of locales) mapa.set(p.id_pago, p);
    for (const p of deApi) mapa.set(p.id_pago, p);
    return filtrarPagosLocales(Array.from(mapa.values()), params);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      const locales = obtenerPagosDeCacheLocal();
      return filtrarPagosLocales(locales, params);
    }
    throw error;
  }
}

/**
 * Detecta si el error devuelto por la API corresponde a 409 MONTO_DISTINTO.
 * Ocurre cuando el monto ingresado difiere del precio vigente y requiere confirmación explícita.
 */
export function esMontoDistinto(error: unknown): boolean {
  if (!isAxiosError(error) || error.response?.status !== 409) return false;
  const datos = error.response.data as { error?: { code?: string } } | undefined;
  return datos?.error?.code === "MONTO_DISTINTO";
}
