import { apiClient } from "@/api/client";
import type {
  InformarTransferenciaFormData,
  MiPlanRespuesta,
  TransferenciaApi,
} from "../schemas/transferencia";

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
