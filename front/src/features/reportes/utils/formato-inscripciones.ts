import type { AltasDelMes } from "@/types/reportes";

// Formato de las estadísticas de inscriptos por mes (US-35). Funciones puras.

export const MES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"] as const;

const FORMATO_DECIMAL = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** El año en curso y los tres anteriores: más atrás no hay datos del sistema. */
export function aniosConsultables(anioActual: number): number[] {
  return [anioActual, anioActual - 1, anioActual - 2, anioActual - 3];
}

/** `hoy` es AAAA-MM-DD. Un mes que todavía no empezó no tiene altas "en cero": no ocurrió. */
export function esMesFuturo({ mes, anio }: Pick<AltasDelMes, "mes" | "anio">, hoy: string): boolean {
  const [anioHoy, mesHoy] = [Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7))];
  return anio > anioHoy || (anio === anioHoy && mes > mesHoy);
}

export function esMesEnCurso({ mes, anio }: Pick<AltasDelMes, "mes" | "anio">, hoy: string): boolean {
  return anio === Number(hoy.slice(0, 4)) && mes === Number(hoy.slice(5, 7));
}

export function mesesTranscurridos(meses: AltasDelMes[], hoy: string): AltasDelMes[] {
  return meses.filter((mes) => !esMesFuturo(mes, hoy));
}

/**
 * Promedio sobre los meses que ya empezaron. El back divide por los 12 meses del año, y en el año en
 * curso eso daría un promedio más bajo del real.
 */
export function promedioMensual(transcurridos: AltasDelMes[]): number {
  if (transcurridos.length === 0) return 0;
  return transcurridos.reduce((total, mes) => total + mes.cantidad, 0) / transcurridos.length;
}

export function formatearDecimal(valor: number): string {
  return FORMATO_DECIMAL.format(valor);
}

/** Total acumulado del año hasta cada mes. */
export function acumulados(meses: AltasDelMes[]): number[] {
  let total = 0;
  return meses.map(({ cantidad }) => (total += cantidad));
}

export type Tendencia = "sube" | "baja" | "igual" | "sin-dato";

export function tendencia({ diferencia }: Pick<AltasDelMes, "diferencia">): Tendencia {
  if (diferencia === null) return "sin-dato";
  return diferencia > 0 ? "sube" : diferencia < 0 ? "baja" : "igual";
}

/** "+3 (+27,3 %)", "−2 (−20 %)", "+3" si el mes anterior tuvo 0, "Igual" o "—" en el primer mes. */
export function describirComparacion({ diferencia, variacion }: Pick<AltasDelMes, "diferencia" | "variacion">): string {
  if (diferencia === null) return "—";
  if (diferencia === 0) return "Igual";
  const signo = diferencia > 0 ? "+" : "−";
  const cantidad = `${signo}${Math.abs(diferencia)}`;
  return variacion === null ? cantidad : `${cantidad} (${signo}${FORMATO_DECIMAL.format(Math.abs(variacion))} %)`;
}

/** "1 alta" o "12 altas". */
export function cantidadDeAltas(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "alta" : "altas"}`;
}
