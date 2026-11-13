import { apiClient } from "@/api/client";
import {
  efectivoPendienteSchema,
  paginaRendicionesSchema,
  resultadoRendicionSchema,
  type EfectivoPendiente,
  type PaginaRendiciones,
  type ResultadoRendicion,
} from "../schemas/rendicion";

export interface FiltrosEfectivoPendiente {
  id_profesora?: number;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

export async function obtenerEfectivoPendiente(
  params?: FiltrosEfectivoPendiente
): Promise<EfectivoPendiente> {
  const respuesta = await apiClient.get("/pagos/efectivo-pendiente", { params });
  return efectivoPendienteSchema.parse(respuesta.data);
}

export async function rendirCobroIndividual(
  idPago: number,
  observaciones?: string
): Promise<ResultadoRendicion> {
  const respuesta = await apiClient.post(`/pagos/${idPago}/rendir`, {
    observaciones: observaciones || undefined,
  });
  return resultadoRendicionSchema.parse(respuesta.data);
}

export interface RendirLoteInput {
  id_profesora?: number;
  ids_pagos?: number[];
  observaciones?: string;
}

export async function rendirLote(datos: RendirLoteInput): Promise<ResultadoRendicion> {
  const respuesta = await apiClient.post("/pagos/rendir", datos);
  return resultadoRendicionSchema.parse(respuesta.data);
}

export interface FiltrosHistorialRendiciones {
  id_profesora?: number;
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

export async function obtenerHistorialRendiciones(
  params?: FiltrosHistorialRendiciones
): Promise<PaginaRendiciones> {
  const respuesta = await apiClient.get("/pagos/rendiciones", { params });
  return paginaRendicionesSchema.parse(respuesta.data);
}
