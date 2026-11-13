import type { TipoTransferencia } from "@/types/transferencia";
import type { AlumnoDetalle } from "@/features/alumnos/schemas/alumno";
import type { EstadoTransferencia } from "@/types/transferencia";

// Cómo se muestra una transferencia. Funciones puras: se testean sin render.

const FORMATO_FECHA_HORA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const FORMATO_DIA_HORA_CORTO = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Timestamp ISO → "13/10/2026, 07:45 h", en el huso horario de quien mira. */
export function formatearFechaHora(timestamp: string): string {
  return `${FORMATO_FECHA_HORA.format(new Date(timestamp))} h`;
}

/** Timestamp ISO → "13/10, 07:45": para la lista, donde el año sobra. */
export function formatearDiaHoraCorto(timestamp: string): string {
  return FORMATO_DIA_HORA_CORTO.format(new Date(timestamp));
}

// Glosario: nunca "pago" en la interfaz; "pendiente de verificación", no "de confirmación".
const ETIQUETA_ESTADO: Record<EstadoTransferencia, string> = {
  PENDIENTE: "Pendiente de verificación",
  CONFIRMADO: "Aprobada",
  RECHAZADO: "Rechazada",
};

export function etiquetaEstado(estado: EstadoTransferencia): string {
  return ETIQUETA_ESTADO[estado];
}

export type { TipoTransferencia } from "@/types/transferencia";

const ETIQUETA_TIPO: Record<TipoTransferencia, string> = {
  PRIMERA_CUOTA: "Primera cuota",
  CUOTA_VENCIDA: "Cuota vencida",
  RENOVACION: "Renovación",
};

export function etiquetaTipo(tipo: TipoTransferencia): string {
  return ETIQUETA_TIPO[tipo];
}

/**
 * El back no informa el tipo de la transferencia: se deduce de la situación actual del alumno, así
 * que solo vale para una pendiente. Una pre-inscripción espera su primera cuota; si no, la cuota
 * está vencida o es una renovación. null si el alumno no tiene una inscripción vigente.
 */
export function tipoDeTransferencia(ficha: AlumnoDetalle): TipoTransferencia | null {
  const { inscripcion } = ficha;
  if (!inscripcion) return null;
  if (inscripcion.estado === "PREINSCRIPTA") return "PRIMERA_CUOTA";
  const estadoCuota = inscripcion.situacion_cuota?.estado;
  return estadoCuota === "VENCIDA" || estadoCuota === "CLASE_SUELTA_VENCIDA" ? "CUOTA_VENCIDA" : "RENOVACION";
}
