import { registrarError } from "../../shared/utils/registro-errores.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { CierreMensualInsigniasService } from "./cierre-mensual-insignias/cierre-mensual-insignias.service.js";
import type { InsigniaService } from "./insignia/insignia.service.js";
import type { FichaInsignias, FiltroRanking, RankingAsistencia } from "./insignia/insignia.types.js";
import type { ILogicaInsignias } from "./interface/i-logica-insignias.js";

// Realiza ILogicaInsignias pasando cada operación a Insignia. Antes de responder corre el cierre del
// mes anterior, porque el intervalo no alcanza si Render durmió el proceso (arquitectura.md); si falla,
// la consulta igual responde con lo que ya estaba otorgado.
export class GestionInsigniasService implements ILogicaInsignias {
  constructor(
    private readonly insignias: InsigniaService,
    private readonly cierreMensual: CierreMensualInsigniasService,
  ) {}

  async obtenerFichaInsignias(idAlumno: number, solicitante: Solicitante): Promise<FichaInsignias> {
    await this.cerrarMesPendiente();
    return this.insignias.obtenerFicha(idAlumno, solicitante);
  }

  async consultarRankingAsistencia(
    filtro: FiltroRanking,
    solicitante: Solicitante,
  ): Promise<RankingAsistencia> {
    await this.cerrarMesPendiente();
    return this.insignias.consultarRanking(filtro, solicitante);
  }

  private async cerrarMesPendiente(): Promise<void> {
    try {
      await this.cierreMensual.cerrarMesAnterior();
    } catch (error) {
      registrarError("CIERRE_MENSUAL_INSIGNIAS", error);
    }
  }
}
