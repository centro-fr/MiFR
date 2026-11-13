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

export function formatearDecimal(valor: number): string {
  return FORMATO_DECIMAL.format(valor);
}
