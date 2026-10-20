import type { ResumenCuotasVencidas } from "../../gestion-cuotas-y-pagos/cuota/cuota.types.js";
import type {
  ResumenEfectivoPendiente,
  ResumenTransferenciasPendientes,
} from "../../gestion-cuotas-y-pagos/pago/pago.types.js";

export type BloqueDelResumen = "transferencias" | "efectivo" | "cuotas_vencidas";

// US-26: lo pendiente del día. Un bloque que no se pudo armar llega en null y figura en
// bloques_con_error; los otros salen igual.
export interface ResumenDiario {
  fecha: Date;
  transferencias: ResumenTransferenciasPendientes | null;
  efectivo: ResumenEfectivoPendiente | null;
  cuotas_vencidas: ResumenCuotasVencidas | null;
  bloques_con_error: BloqueDelResumen[];
  // Nada pendiente en ningún bloque, y todos se pudieron armar: el "Todo al día" de la spec.
  sin_novedades: boolean;
}
