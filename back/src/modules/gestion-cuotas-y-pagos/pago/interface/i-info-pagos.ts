import type {
  FiltroTransferencias,
  ResumenEfectivoPendiente,
  TransferenciaEnRevision,
} from "../pago.types.js";

// Interfaz provista por Pago (GestionCuotasYPagos) en la vista arquitectónica. La requiere
// ResumenDiarioPropietaria (GestionNotificaciones) para el resumen del día (US-26): las
// transferencias que esperan revisión y el efectivo que las profesoras todavía no rindieron.
export interface IInfoPagos {
  // Ordenadas por antigüedad, con las horas desde la carga y la marca de las que pasaron las 24 horas.
  listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaEnRevision[]>;
  // US-19: cantidad y total, por profesora y en general, y el cobro sin rendir más viejo.
  resumenEfectivoPendiente(): Promise<ResumenEfectivoPendiente>;
}
