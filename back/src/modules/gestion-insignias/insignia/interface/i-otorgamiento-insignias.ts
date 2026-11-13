import type { ResumenCierreMensual } from "../insignia.types.js";

// Interfaz provista por Insignia (GestionInsignias) en la vista arquitectónica: la usa el proceso
// CierreMensualInsignias para otorgar las insignias mensuales sin conocer su persistencia.
export interface IOtorgamientoInsignias {
  // Otorga Mes perfecto y Podio del mes del período AAAA-MM. Volver a correrlo no duplica nada.
  cerrarMes(periodo: string, ahora: Date): Promise<ResumenCierreMensual>;
}
