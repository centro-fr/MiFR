import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";

/**
 * Formatea una fecha o timestamp ISO (ej: "2026-10-12" o "2026-10-12T15:30:00.000Z")
 * al formato argentino "DD/MM/AAAA".
 */
export function formatearFechaCobro(fechaIsoOValor: string): string {
  if (!fechaIsoOValor) return "";
  const soloFecha = fechaIsoOValor.includes("T")
    ? fechaIsoOValor.slice(0, 10)
    : fechaIsoOValor;
  return formatearFecha(soloFecha);
}
