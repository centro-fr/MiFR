import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { ResumenCierreMensual } from "../insignia/insignia.types.js";
import type { IOtorgamientoInsignias } from "../insignia/interface/i-otorgamiento-insignias.js";

// AAAA-MM del mes anterior al día recibido (columna DATE, a las 00:00 UTC).
function periodoAnterior(hoy: Date): string {
  return new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

// Componente CierreMensualInsignias (<<process>>) de la vista arquitectónica (US-31). Desde el día 1
// cierra el mes anterior y otorga Mes perfecto y Podio del mes. Como Render duerme el proceso sin
// tráfico, lo corren el intervalo de index.ts y también la consulta de la ficha y del ranking.
export class CierreMensualInsigniasService {
  // Un cierre por mes y por proceso: después no hace falta volver a recorrer las asistencias. Si una
  // corrida falla, la próxima lo vuelve a intentar.
  private ultimoPeriodoCerrado: string | null = null;

  constructor(private readonly insignias: IOtorgamientoInsignias) {}

  // null si ese mes ya se cerró en este proceso.
  async cerrarMesAnterior(ahora: Date = new Date()): Promise<ResumenCierreMensual | null> {
    const periodo = periodoAnterior(fechaActualArgentina(ahora));
    if (this.ultimoPeriodoCerrado === periodo) return null;
    const resumen = await this.insignias.cerrarMes(periodo, ahora);
    this.ultimoPeriodoCerrado = periodo;
    return resumen;
  }
}
