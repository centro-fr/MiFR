import type { TipoPlan } from "../../gestion-servicio-entrenamiento/plan/plan.types.js";
import type { DatosVencimiento } from "./calculador-vencimiento-cuota.types.js";
import type { ICalculoVencimiento } from "./interface/i-calculo-vencimiento.js";

// Strategy: un algoritmo de vencimiento por tipo de plan (planes.tipo). Al ser un Record sobre
// TipoPlan, si el enum suma un tipo nuevo el compilador obliga a definir su estrategia.
type EstrategiaVencimiento = (desde: Date) => Date;

// De fecha a fecha: el mismo día del mes siguiente. Si ese mes no tiene ese día, vence el último
// (31/01 → 28 o 29/02). Date.UTC(anio, mes + 2, 0) es el último día del mes siguiente.
const vencimientoMensual: EstrategiaVencimiento = (desde) => {
  const anio = desde.getUTCFullYear();
  const mes = desde.getUTCMonth();
  const ultimoDiaDelMesSiguiente = new Date(Date.UTC(anio, mes + 2, 0)).getUTCDate();
  return new Date(Date.UTC(anio, mes + 1, Math.min(desde.getUTCDate(), ultimoDiaDelMesSiguiente)));
};

// Vence el mismo día de la clase contratada, sin días de gracia.
const vencimientoClaseSuelta: EstrategiaVencimiento = (desde) => new Date(desde.getTime());

const ESTRATEGIAS: Record<TipoPlan, EstrategiaVencimiento> = {
  MENSUAL: vencimientoMensual,
  CLASE_SUELTA: vencimientoClaseSuelta,
};

// Cálculo puro: no lee la base ni la hora del servidor.
export class CalculadorVencimientoCuota implements ICalculoVencimiento {
  calcularVencimiento({ tipoPlan, desde }: DatosVencimiento): Date {
    return ESTRATEGIAS[tipoPlan](desde);
  }
}