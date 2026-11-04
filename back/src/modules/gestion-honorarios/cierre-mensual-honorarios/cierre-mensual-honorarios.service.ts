import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { ICierreLiquidaciones } from "../liquidacion/interface/i-cierre-liquidaciones.js";
import type { PeriodoLiquidacion, ResumenCierreHonorarios } from "../liquidacion/liquidacion.types.js";

// El mes anterior al día recibido, con su primer y su último día (columna DATE, a las 00:00 UTC).
function periodoAnterior(hoy: Date): PeriodoLiquidacion {
  const desde = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - 1, 1));
  const hasta = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth(), 0));
  return { periodo: desde.toISOString().slice(0, 7), desde, hasta };
}

// Componente CierreMensualHonorarios (<<process>>) de la vista arquitectónica (US-23). Desde
// DIA_CIERRE_HONORARIOS cierra las liquidaciones del mes anterior: los primeros días quedan para que
// entren los cobros atrasados. Como Render duerme el proceso sin tráfico, lo corren el intervalo de
// index.ts y también la consulta de las liquidaciones.
export class CierreMensualHonorariosService {
  // Un cierre por mes y por proceso. Si una corrida falla, la próxima lo vuelve a intentar.
  private ultimoPeriodoCerrado: string | null = null;

  constructor(
    private readonly liquidaciones: ICierreLiquidaciones,
    private readonly parametros: IInfoParametros,
  ) {}

  // null si ese mes ya se cerró en este proceso o si todavía no llegó el día de cierre.
  async cerrarMesAnterior(ahora: Date = new Date()): Promise<ResumenCierreHonorarios | null> {
    const hoy = fechaActualArgentina(ahora);
    const periodo = periodoAnterior(hoy);
    if (this.ultimoPeriodoCerrado === periodo.periodo) return null;

    const diaDeCierre = await this.parametros.obtener("DIA_CIERRE_HONORARIOS");
    if (hoy.getUTCDate() < diaDeCierre) return null;

    const resumen = await this.liquidaciones.cerrarMes(periodo);
    this.ultimoPeriodoCerrado = periodo.periodo;
    return resumen;
  }
}
