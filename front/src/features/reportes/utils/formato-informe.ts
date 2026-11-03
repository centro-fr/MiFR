import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import type { FiltrosInformeAsistencia } from "@/types/reportes";

// Formato del informe de asistencia (US-33). Funciones puras.

const FORMATO_PORCENTAJE = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 1 });

/** "87,5 %". */
export function formatearPorcentaje(valor: number): string {
  return `${FORMATO_PORCENTAJE.format(valor)} %`;
}

/** "Del 01/10/2026 al 27/10/2026". */
export function periodoDelInforme(desde: string, hasta: string): string {
  return `Del ${formatearFecha(desde)} al ${formatearFecha(hasta)}`;
}

/** Los filtros como los lee una persona: los nombres, no los ids. */
export interface FiltrosDescritos {
  alumno: string | null;
  profesora: string | null;
  actividad: string | null;
  incluirBajas: boolean;
}

/** ["Alumno: Valentina Herrera", "Profesora: Lucía Gómez", "Incluye dados de baja"]; vacío sin filtros. */
export function filtrosAplicados({ alumno, profesora, actividad, incluirBajas }: FiltrosDescritos): string[] {
  return [
    alumno && `Alumno: ${alumno}`,
    profesora && `Profesora: ${profesora}`,
    actividad && `Actividad: ${actividad}`,
    incluirBajas ? "Incluye dados de baja" : null,
  ].filter((texto): texto is string => Boolean(texto));
}

/** El mes en curso hasta hoy: el período que toma el back si no se le pasan fechas. */
export function filtrosIniciales(hoy: string): FiltrosInformeAsistencia {
  return { desde: `${hoy.slice(0, 8)}01`, hasta: hoy, idAlumno: null, idProfesora: null, idActividad: null, incluirBajas: false };
}
