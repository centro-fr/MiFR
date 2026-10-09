import type { TipoPlan } from "../../gestion-servicio-entrenamiento/plan/plan.types.js";

export interface DatosVencimiento {
  tipoPlan: TipoPlan;
  // Primer día que cubre la cuota (DATE, día de Argentina): el del pago, o el vencimiento de la
  // cuota vigente si el alumno paga por adelantado. En CLASE_SUELTA, el día de la clase.
  desde: Date;
}
