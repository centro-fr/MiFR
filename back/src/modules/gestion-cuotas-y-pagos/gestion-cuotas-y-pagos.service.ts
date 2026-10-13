import type { IUnidadDeTrabajo } from "../../shared/db/transaccion.js";
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
  RendirLoteInput,
} from "./pago/pago.schemas.js";
import type {
  Comprobante,
  EfectivoPendiente,
  FiltroEfectivo,
  FiltroTransferencias,
  PaginaRendiciones,
  Pago,
  ResultadoRendicion,
  TransferenciaConAlumno,
  TransferenciaEnRevision,
} from "./pago/pago.types.js";

// Realiza ILogicaCuotasPagos coordinando Cuota (qué cuota se cobra y el alta definitiva) y Pago
// (quién cobra, el monto y el registro).
//
// Quién paga se verifica antes de preparar la cuota: si no, los errores de una inscripción ajena
// (baja, transferencia pendiente, sin precio) le contarían su estado a cualquiera.
//
// Un pago confirmado y el alta definitiva que dispara (US-07) se guardan en una sola transacción:
// la inscripción, el alumno, su usuario, el rol y el pago quedan todos o ninguno. El alta va primero
// para que una inscripción sin cupo rechace el cobro antes de calcular nada más.
export class GestionCuotasYPagosService implements ILogicaCuotasPagos {
  constructor(
    private readonly cuotas: CuotaService,
    private readonly pagos: PagoService,
    private readonly unidadDeTrabajo: IUnidadDeTrabajo,
  ) {}

  async registrarCobroEfectivo(input: RegistrarEfectivoInput, solicitante: Solicitante): Promise<Pago> {
    const inscripcion = await this.inscripcionACobrar(input.id_inscripcion, solicitante);
    const idProfesoraCobra = await this.pagos.profesoraQueCobra(inscripcion, solicitante);
    const cuota = await this.cuotas.prepararCobro(inscripcion);
    const datos = this.pagos.prepararEfectivo(cuota, input, solicitante, idProfesoraCobra);
    return this.conAltaDefinitiva(inscripcion.id_inscripcion, () => this.pagos.guardar(cuota, datos));
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
    return this.conAltaDefinitiva(cuota.inscripcion.id_inscripcion, () => this.pagos.guardar(cuota, datos));
  }

  async aprobarTransferencia(
    id: number,
    input: AprobarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<Pago> {
    const idInscripcion = await this.pagos.prepararAprobacion(id, input);
    return this.conAltaDefinitiva(idInscripcion, () => this.pagos.confirmar(id, solicitante));
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

  listarEfectivoPendiente(
    filtro: FiltroEfectivo,
    pagina: { limit: number; offset: number },
  ): Promise<EfectivoPendiente> {
    return this.pagos.efectivoPendiente(filtro, pagina);
  }

  listarRendiciones(
    filtro: FiltroEfectivo,
    pagina: { limit: number; offset: number },
  ): Promise<PaginaRendiciones> {
    return this.pagos.listarRendiciones(filtro, pagina);
  }

  rendirCobro(id: number): Promise<ResultadoRendicion> {
    return this.pagos.rendir(id);
  }

  rendirCobros(input: RendirLoteInput): Promise<ResultadoRendicion> {
    return this.pagos.rendirLote(input);
  }

  private conAltaDefinitiva(idInscripcion: number, confirmarPago: () => Promise<Pago>): Promise<Pago> {
    return this.unidadDeTrabajo.ejecutar(async () => {
      await this.cuotas.darAltaDefinitiva(idInscripcion);
      return confirmarPago();
    });
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
