import type { Paginacion } from "../../../../shared/utils/esquemas-paginacion.js";
import type {
  FiltroCobranzaService,
  FiltroTransferencias,
  PaginaTransferencias,
  ResultadoCobranza,
  ResumenEfectivoPendiente,
  ResumenTransferenciasPendientes,
} from "../pago.types.js";

// Interfaz provista por Pago (GestionCuotasYPagos) en la vista arquitectónica. La requiere
// ResumenDiarioPropietaria (GestionNotificaciones) para el resumen del día (US-26): las
// transferencias que esperan revisión y el efectivo que las profesoras todavía no rindieron.
export interface IInfoPagos {
  // Una página, ordenada por antigüedad, con las horas desde la carga y la marca de las que pasaron las
  // 24 horas, y el total de las que cumplen el filtro.
  listarTransferencias(filtro: FiltroTransferencias): Promise<PaginaTransferencias>;
  // US-26: cantidad y total de las que esperan revisión, cuántas pasaron o están por pasar las 24
  // horas, y las más viejas.
  resumenTransferenciasPendientes(): Promise<ResumenTransferenciasPendientes>;
  // US-19: cantidad y total, por profesora y en general, y el cobro sin rendir más viejo.
  resumenEfectivoPendiente(): Promise<ResumenEfectivoPendiente>;
  // Informe de cobranza por período: pagos CONFIRMADOS agrupados por forma de pago con detalle paginado.
  obtenerCobranza(filtro: FiltroCobranzaService, paginacion: Paginacion): Promise<ResultadoCobranza>;
}
