import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { CuotaService } from "./cuota/cuota.service.js";
import type { ILogicaCuotasPagos } from "./interface/i-logica-cuotas-pagos.js";
import type { PagoService } from "./pago/pago.service.js";
import type {
  AprobarTransferenciaInput,
  InformarTransferenciaInput,
  RechazarTransferenciaInput,
  RegistrarEfectivoInput,
  RegistrarTransferenciaRecibidaInput,
} from "./pago/pago.schemas.js";
import type {
  Comprobante,
  FiltroTransferencias,
  Pago,
  TransferenciaConAlumno,
  TransferenciaEnRevision,
} from "./pago/pago.types.js";

// Realiza ILogicaCuotasPagos coordinando Cuota (qué cuota se cobra y el alta definitiva) y Pago
// (quién cobra, el monto y el registro).
//
// En cada pago confirmado, el alta definitiva (US-07) va antes de guardar el pago: si la
// inscripción ya no tiene cupo, el cobro se rechaza sin dejar un pago registrado. Como activar es
// idempotente, reintentar un cobro que falló al guardarse no duplica nada.
export class GestionCuotasYPagosService implements ILogicaCuotasPagos {
  constructor(
    private readonly cuotas: CuotaService,
    private readonly pagos: PagoService,
  ) {}

  async registrarCobroEfectivo(input: RegistrarEfectivoInput, solicitante: Solicitante): Promise<Pago> {
    const cuota = await this.cuotas.prepararCobro(input.id_inscripcion);
    const datos = await this.pagos.prepararEfectivo(cuota, input, solicitante);
    await this.cuotas.darAltaDefinitiva(cuota.inscripcion.id_inscripcion);
    return this.pagos.guardar(cuota, datos);
  }

  // Queda pendiente: no da el alta ni cambia la habilitación hasta que la apruebe la propietaria.
  async informarTransferencia(input: InformarTransferenciaInput, solicitante: Solicitante): Promise<Pago> {
    const cuota = await this.cuotas.prepararCobro(input.id_inscripcion);
    const datos = await this.pagos.prepararTransferencia(cuota, input, solicitante);
    return this.pagos.guardar(cuota, datos);
  }

  async registrarTransferenciaRecibida(
    input: RegistrarTransferenciaRecibidaInput,
    solicitante: Solicitante,
  ): Promise<Pago> {
    const cuota = await this.cuotas.prepararCobro(input.id_inscripcion);
    const datos = await this.pagos.prepararTransferenciaRecibida(cuota, input, solicitante);
    await this.cuotas.darAltaDefinitiva(cuota.inscripcion.id_inscripcion);
    return this.pagos.guardar(cuota, datos);
  }

  async aprobarTransferencia(
    id: number,
    input: AprobarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<Pago> {
    const idInscripcion = await this.pagos.prepararAprobacion(id, input);
    await this.cuotas.darAltaDefinitiva(idInscripcion);
    return this.pagos.confirmar(id, solicitante);
  }

  rechazarTransferencia(
    id: number,
    input: RechazarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<Pago> {
    return this.pagos.rechazar(id, input, solicitante);
  }

  listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaEnRevision[]> {
    return this.pagos.listarTransferencias(filtro);
  }

  listarMisTransferencias(solicitante: Solicitante): Promise<TransferenciaConAlumno[]> {
    return this.pagos.listarMisTransferencias(solicitante);
  }

  obtenerComprobante(id: number, solicitante: Solicitante): Promise<Comprobante> {
    return this.pagos.obtenerComprobante(id, solicitante);
  }
}
