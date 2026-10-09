import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type {
  AprobarTransferenciaInput,
  InformarTransferenciaInput,
  RechazarTransferenciaInput,
  RegistrarEfectivoInput,
  RegistrarTransferenciaRecibidaInput,
} from "../pago/pago.schemas.js";
import type {
  Comprobante,
  FiltroTransferencias,
  Pago,
  TransferenciaConAlumno,
  TransferenciaEnRevision,
} from "../pago/pago.types.js";

// La parte de ILogicaCuotasPagos que usa el controller de Pago. No es una interfaz nueva del
// diagrama: la que provee el subsistema es la unión.
export interface ILogicaPagos {
  registrarCobroEfectivo(input: RegistrarEfectivoInput, solicitante: Solicitante): Promise<Pago>;
  informarTransferencia(input: InformarTransferenciaInput, solicitante: Solicitante): Promise<Pago>;
  registrarTransferenciaRecibida(
    input: RegistrarTransferenciaRecibidaInput,
    solicitante: Solicitante,
  ): Promise<Pago>;
  aprobarTransferencia(id: number, input: AprobarTransferenciaInput, solicitante: Solicitante): Promise<Pago>;
  rechazarTransferencia(
    id: number,
    input: RechazarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<Pago>;
  listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaEnRevision[]>;
  listarMisTransferencias(solicitante: Solicitante): Promise<TransferenciaConAlumno[]>;
  obtenerComprobante(id: number, solicitante: Solicitante): Promise<Comprobante>;
}

// Interfaz del subsistema GestionCuotasYPagos en la vista arquitectónica: lo que consume la
// presentación (CuotasPagosPresWeb). IInfoCuotas queda para los otros subsistemas.
export interface ILogicaCuotasPagos extends ILogicaPagos {}
