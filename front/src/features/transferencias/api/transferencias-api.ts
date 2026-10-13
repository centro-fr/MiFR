import { z } from "zod";
import { apiClient } from "@/api/client";
import { codigoDeErrorApi } from "@/api/errores";
import { transferenciaApiSchema, type TransferenciaApi } from "@/features/transferencias/schemas/transferencia";
import type { EstadoTransferencia, Transferencia } from "@/types/transferencia";

/** El máximo que acepta el back por página (LIMITE_MAXIMO). */
export const TRANSFERENCIAS_POR_PAGINA = 100;

function aTransferencia(api: TransferenciaApi): Transferencia {
  return {
    id: api.id_pago,
    estado: api.estado,
    monto: api.monto,
    cargadaEl: api.fecha_pago,
    realizadaEl: api.fecha_hora_transferencia,
    titularCuenta: api.titular_cuenta_origen,
    observaciones: api.observaciones,
    resueltaEl: api.fecha_confirmacion,
    motivoRechazo: api.motivo_rechazo,
    alumno: { id: api.alumno.id_alumno, nombre: api.alumno.nombre, apellido: api.alumno.apellido },
    horasDesdeLaCarga: api.horas_desde_la_carga,
    superaPlazo: api.supera_24_horas,
  };
}

interface ConsultaTransferencias {
  estado?: EstadoTransferencia;
  idAlumno?: number;
  offset?: number;
}

/** GET /pagos/transferencias: de la más antigua a la más nueva, como las ordena el back. */
export async function listarTransferencias({ estado, idAlumno, offset = 0 }: ConsultaTransferencias): Promise<Transferencia[]> {
  const { data } = await apiClient.get("/pagos/transferencias", {
    params: { estado, id_alumno: idAlumno, limit: TRANSFERENCIAS_POR_PAGINA, offset },
  });
  return z.array(transferenciaApiSchema).parse(data).map(aTransferencia);
}

/**
 * Sin confirmar, un monto distinto del esperado vuelve como 409 MONTO_DISTINTO: la pantalla lo
 * muestra y reintenta con la confirmación. Si es la primera cuota, el back da el alta definitiva.
 */
export async function aprobarTransferencia(id: number, confirmarMontoDistinto: boolean): Promise<void> {
  await apiClient.post(`/pagos/${id}/aprobar`, { confirmar_monto_distinto: confirmarMontoDistinto });
}

export async function rechazarTransferencia(id: number, motivoRechazo: string): Promise<void> {
  await apiClient.post(`/pagos/${id}/rechazar`, { motivo_rechazo: motivoRechazo });
}

export function esMontoDistinto(error: unknown): boolean {
  return codigoDeErrorApi(error) === "MONTO_DISTINTO";
}
