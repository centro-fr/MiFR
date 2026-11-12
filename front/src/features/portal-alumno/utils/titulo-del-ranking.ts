import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { nombreDelMes } from "@/features/asistencia/utils/semana";

// Cómo se llama el ranking según su período, igual en el celular y en escritorio. Función pura.

/**
 * "Ranking de noviembre" si es un mes (el del año en curso sin el año), "Ranking de 2026" si va desde el
 * 1 de enero dentro del mismo año, y si no "Ranking del 05/10/2026 al 20/10/2026".
 */
export function tituloDelRanking(periodo: { desde: string; hasta: string }, hoy: string): string {
  const desde = periodo.desde.slice(0, 10);
  const hasta = periodo.hasta.slice(0, 10);
  const anio = desde.slice(0, 4);
  const mismoAnio = anio === hasta.slice(0, 4);
  if (desde.endsWith("-01") && desde.slice(0, 7) === hasta.slice(0, 7)) {
    return `Ranking de ${nombreDelMes(desde)}${anio === hoy.slice(0, 4) ? "" : ` ${anio}`}`;
  }
  if (desde.slice(5) === "01-01" && mismoAnio) return `Ranking de ${anio}`;
  return `Ranking del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
}
