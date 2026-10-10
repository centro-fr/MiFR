import { ForbiddenError, NotFoundError } from "../../shared/errors/app-error.js";
import type { Solicitante } from "../../shared/utils/solicitante.types.js";
import type { InscripcionACobrar } from "../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
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
// Quién paga se verifica antes de preparar la cuota: si no, los errores de una inscripción ajena
// (baja, transferencia pendiente, sin precio) le contarían su estado a cualquiera.
//
// En el primer pago confirmado, el alta definitiva (US-07) va antes de guardar el pago: si la
// inscripción ya no tiene cupo, el cobro se rechaza sin dejar un pago registrado. Si después falla
// el guardado, la inscripción queda ACTIVA sin una cuota confirmada: la habilitación se calcula con
// las cuotas pagas, así que el alumno sigue sin poder asistir, y el reintento del cobro la completa.
export class GestionCuotasYPagosService implements ILogicaCuotasPagos {
  constructor(
    private readonly cuotas: CuotaService,
    private readonly pagos: PagoService,
  ) {}

  async registrarCobroEfectivo(input: RegistrarEfectivoInput, solicitante: Solicitante): Promise<Pago> {
    const inscripcion = await this.inscripcionACobrar(input.id_inscripcion, solicitante);
    const idProfesoraCobra = await this.pagos.profesoraQueCobra(inscripcion, solicitante);
    const cuota = await this.cuotas.prepararCobro(inscripcion);
    const datos = this.pagos.prepararEfectivo(cuota, input, solicitante, idProfesoraCobra);
    await this.cuotas.darAltaDefinitiva(inscripcion.id_inscripcion);
    return this.pagos.guardar(cuota, datos);
  }

  // Queda pendiente: no da el alta ni cambia la habilitación hasta que la apruebe la propietaria.
  async informarTransferencia(input: InformarTransferenciaInput, solicitante: Solicitante): Promise<Pago> {
    const inscripcion = await this.inscripcionACobrar(input.id_inscripcion, solicitante);
    this.pagos.verificarTitular(inscripcion, solicitante);
    const cuota = await this.cuotas.prepararCobro(inscripcion);
    const datos = await this.pagos.prepararTransferencia(cuota, input, solicitante);
    return this.pagos.guardar(cuota, datos);
  }

  async registrarTransferenciaRecibida(
    input: RegistrarTransferenciaRecibidaInput,
    solicitante: Solicitante,
  ): Promise<Pago> {
    const cuota = await this.cuotas.prepararCobro(
      await this.inscripcionACobrar(input.id_inscripcion, solicitante),
    );
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

  // A quien no es propietaria no se le confirma si existe una inscripción: para una ajena recibe el
  // mismo 403 que para una que no existe.
  private async inscripcionACobrar(id: number, solicitante: Solicitante): Promise<InscripcionACobrar> {
    const inscripcion = await this.cuotas.buscarInscripcion(id);
    if (inscripcion) return inscripcion;
    if (solicitante.esPropietaria) throw new NotFoundError("Inscripción no encontrada");
    throw new ForbiddenError("No podés registrar pagos de esa inscripción");
  }
}
