import type { TipoPlan } from "../../gestion-servicio-entrenamiento/plan/plan.types.js";

// Los cinco estados de US-18, más PENDIENTE_DE_PAGO para quien todavía no pagó ninguna cuota
// (pre-inscripto, o el que volvió a ese estado por una transferencia rechazada, US-17).
export const ESTADOS_HABILITACION = [
  "AL_DIA",
  "POR_VENCER",
  "VENCIDA",
  "CLASE_SUELTA_VIGENTE",
  "CLASE_SUELTA_VENCIDA",
  "PENDIENTE_DE_PAGO",
] as const;
export type EstadoHabilitacion = (typeof ESTADOS_HABILITACION)[number];

export interface DatosHabilitacion {
  tipoPlan: TipoPlan;
  // Vencimiento de la última cuota con pago CONFIRMADO; null si todavía no pagó ninguna.
  vencimiento: Date | null;
  diasGracia: number;
  // Hay una transferencia informada que la propietaria todavía no revisó (US-16).
  tienePagoPendiente: boolean;
  // Parámetro VENCIDOS_PUEDEN_ASISTIR: la política del centro con los vencidos (US-18).
  vencidosPuedenAsistir: boolean;
  // El día de Argentina en que se consulta (fechaActualArgentina()).
  hoy: Date;
}

export interface Habilitacion {
  estado: EstadoHabilitacion;
  fechaVencimiento: Date | null;
  // Días que faltan para el vencimiento: 0 el mismo día, negativo si ya pasó; null sin cuota paga.
  diasRestantes: number | null;
  puedeAsistir: boolean;
}
