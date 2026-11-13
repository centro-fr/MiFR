import type { PeriodoLiquidacion, ResumenCierreHonorarios } from "../liquidacion.types.js";

// Interfaz provista por Liquidacion para el proceso CierreMensualHonorarios (GestionHonorarios,
// <<process>>): recalcula el mes y cierra sus borradores. No paga: eso lo sigue haciendo la propietaria.
export interface ICierreLiquidaciones {
  cerrarMes(periodo: PeriodoLiquidacion): Promise<ResumenCierreHonorarios>;
}
