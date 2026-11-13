import type { Paginacion } from "../../../../shared/utils/esquemas-paginacion.js";
import type {
  FiltroCobranzaService,
  FiltroTransferencias,
  PaginaTransferencias,
  ResultadoCobranza,
} from "../pago.types.js";

// Interfaz provista por Pago (GestionCuotasYPagos) en la vista arquitectónica. La requiere Reportes
// para las transferencias y la cobranza.
export interface IInfoPagos {
  // Una página, ordenada por antigüedad, con las horas desde la carga y la marca de las que pasaron las
  // 24 horas, y el total de las que cumplen el filtro.
  listarTransferencias(filtro: FiltroTransferencias): Promise<PaginaTransferencias>;
  // Informe de cobranza por período: pagos CONFIRMADOS agrupados por forma de pago con detalle paginado.
  obtenerCobranza(filtro: FiltroCobranzaService, paginacion: Paginacion): Promise<ResultadoCobranza>;
}
