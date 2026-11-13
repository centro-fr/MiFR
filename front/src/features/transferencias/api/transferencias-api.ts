import { z } from "zod";
import { apiClient } from "@/api/client";
import { codigoDeErrorApi } from "@/api/errores";
import {
  transferenciaApiSchema,
  type InformarTransferenciaFormData,
  type MiPlanRespuesta,
  type TransferenciaApi,
} from "@/features/transferencias/schemas/transferencia";
import type { EstadoTransferencia, TipoTransferencia, Transferencia } from "@/types/transferencia";

/** El máximo que acepta el back por página (LIMITE_MAXIMO). */
export const TRANSFERENCIAS_POR_PAGINA = 100;

function aFechaHoraConZona(valor: string): string {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) {
    return `${valor}:00-03:00`;
  }
  return new Date(valor).toISOString();
}

/** Obtiene el plan actual, cuota y datos bancarios del alumno en sesión (US-16, US-29). */
export async function obtenerMiPlan(): Promise<MiPlanRespuesta> {
  const { data } = await apiClient.get<MiPlanRespuesta>("/alumnos/mi-plan");
  return data;
}

/** Obtiene las transferencias informadas por el alumno o su tutor (US-16). */
export async function listarMisTransferencias(): Promise<TransferenciaApi[]> {
  const { data } = await apiClient.get<TransferenciaApi[]>("/pagos/mis-transferencias");
  return data;
}

/** Informa un aviso de transferencia bancaria (US-16). */
export async function informarTransferencia(
  datos: InformarTransferenciaFormData,
): Promise<TransferenciaApi> {
  const payload = {
    id_inscripcion: datos.id_inscripcion,
    ...(datos.id_promocion ? { id_promocion: datos.id_promocion } : {}),
    monto: datos.monto,
    fecha_hora_transferencia: aFechaHoraConZona(datos.fecha_hora_transferencia),
    ...(datos.titular_cuenta_origen?.trim()
      ? { titular_cuenta_origen: datos.titular_cuenta_origen.trim() }
      : {}),
    ...(datos.observaciones?.trim()
      ? { observaciones: datos.observaciones.trim() }
      : {}),
  };

  const { data } = await apiClient.post<TransferenciaApi>("/pagos/transferencia", payload);
  return data;
}

const TIPOS_TRANSFERENCIA: readonly TipoTransferencia[] = ["PRIMERA_CUOTA", "CUOTA_VENCIDA", "RENOVACION"];

function esTipoTransferencia(valor: string | undefined): valor is TipoTransferencia {
  return TIPOS_TRANSFERENCIA.includes(valor as TipoTransferencia);
}

function aTransferencia(api: TransferenciaApi): Transferencia {
  return {
    id: api.id_pago,
    estado: api.estado,
    monto: api.monto,
    cargadaEl: api.fecha_pago,
    realizadaEl: api.fecha_hora_transferencia ?? null,
    titularCuenta: api.titular_cuenta_origen ?? null,
    observaciones: api.observaciones ?? null,
    resueltaEl: api.fecha_confirmacion ?? null,
    motivoRechazo: api.motivo_rechazo ?? null,
    alumno: { id: api.alumno.id_alumno, nombre: api.alumno.nombre, apellido: api.alumno.apellido },
    horasDesdeLaCarga: api.horas_desde_la_carga ?? 0,
    superaPlazo: api.supera_24_horas ?? false,
    tipo: esTipoTransferencia(api.tipo) ? api.tipo : null,
    plan: api.plan ?? null,
    idInscripcion: api.id_inscripcion ?? null,
  };
}

/** Por fecha de carga. Sin indicarlo, el back trae primero las más viejas: las que corren el plazo de 24 h. */
export type OrdenTransferencias = "asc" | "desc";

export interface ConsultaTransferencias {
  estado?: EstadoTransferencia;
  idAlumno?: number;
  offset?: number;
  orden?: OrdenTransferencias;
}

export async function listarTransferencias({
  estado,
  idAlumno,
  offset = 0,
  orden,
}: ConsultaTransferencias): Promise<Transferencia[]> {
  const { data } = await apiClient.get("/pagos/transferencias", {
    params: { estado, id_alumno: idAlumno, limit: TRANSFERENCIAS_POR_PAGINA, offset, orden },
  });
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { datos?: unknown[] })?.datos)
    ? (data as { datos: unknown[] }).datos
    : [];
  return z.array(transferenciaApiSchema).parse(items).map(aTransferencia);
}

/**
 * Sin confirmar, un monto distinto del esperado vuelve como 409 MONTO_DISTINTO: la pantalla lo
 * muestra y reintenta con la confirmación. Si es la primera cuota, el back da el alta definitiva.
 */
export async function aprobarTransferencia(
  id: number,
  confirmarMontoDistinto: boolean,
): Promise<void> {
  await apiClient.post(`/pagos/${id}/aprobar`, {
    confirmar_monto_distinto: confirmarMontoDistinto,
  });
}

export async function rechazarTransferencia(id: number, motivoRechazo: string): Promise<void> {
  await apiClient.post(`/pagos/${id}/rechazar`, { motivo_rechazo: motivoRechazo });
}

export function esMontoDistinto(error: unknown): boolean {
  return codigoDeErrorApi(error) === "MONTO_DISTINTO";
}
