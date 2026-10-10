import type { FiltroTransferencias, TransferenciaEnRevision } from "../pago.types.js";

// Interfaz provista por Pago (GestionCuotasYPagos) en la vista arquitectónica. La requiere
// ResumenDiarioPropietaria (GestionNotificaciones) para avisar de las transferencias que esperan
// revisión. Por ahora expone solo eso: el resto de lo que necesite el resumen se agrega cuando se
// implemente, en lugar de adivinarlo.
export interface IInfoPagos {
  // Ordenadas por antigüedad, con las horas desde la carga y la marca de las que pasaron las 24 horas.
  listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaEnRevision[]>;
}
