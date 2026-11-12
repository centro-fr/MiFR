import type { FiltrosRankingAsistencia } from "../api/ranking-asistencia-api";

// El ranking es mensual: la profesora elige el mes ("AAAA-MM"). Funciones puras.

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

function partes(mes: string): { anio: number; numero: number } {
  const [anio, numero] = mes.split("-").map(Number);
  return { anio, numero };
}

/** "2026-11" ± meses. */
export function sumarMeses(mes: string, cantidad: number): string {
  const { anio, numero } = partes(mes);
  const fecha = new Date(Date.UTC(anio, numero - 1 + cantidad, 1));
  return fecha.toISOString().slice(0, 7);
}

/** "Noviembre 2026". */
export function etiquetaDelMes(mes: string): string {
  const { anio, numero } = partes(mes);
  const nombre = MESES[numero - 1];
  return `${nombre.charAt(0).toLocaleUpperCase("es")}${nombre.slice(1)} ${anio}`;
}

/**
 * El período que se le pide al back. El mes en curso va sin filtros: el back ya toma del 1 a hoy, y así
 * comparte la caché con el resto de la app. Un mes pasado va completo.
 */
export function periodoDelMes(mes: string, hoy: string): FiltrosRankingAsistencia {
  if (mes === hoy.slice(0, 7)) return {};
  const { anio, numero } = partes(mes);
  const ultimoDia = new Date(Date.UTC(anio, numero, 0)).getUTCDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${String(ultimoDia).padStart(2, "0")}` };
}

/**
 * Período anual para el ranking (ej: "2026").
 * Si es el año en curso, va desde el 1 de enero hasta hoy (o el 31 de diciembre si es año anterior).
 */
export function periodoDelAnio(anioStr: string, hoy: string): FiltrosRankingAsistencia {
  const anioActual = hoy.slice(0, 4);
  if (anioStr === anioActual) {
    return { desde: `${anioStr}-01-01`, hasta: hoy };
  }
  return { desde: `${anioStr}-01-01`, hasta: `${anioStr}-12-31` };
}

/**
 * Período histórico general (todos los tiempos).
 * Desde una fecha muy temprana hasta hoy.
 */
export function periodoGeneral(hoy: string): FiltrosRankingAsistencia {
  return { desde: "2000-01-01", hasta: hoy };
}
