import {
  ConflictError,
  ForbiddenError,
  MontoDistintoError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Solicitante } from "../../../shared/utils/solicitante.types.js";
import type { InscripcionACobrar } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { CuotaACobrar } from "../cuota/cuota.types.js";
import type { IInfoPagos } from "./interface/i-info-pagos.js";
import type { PagoRepository } from "./pago.repository.js";
import type {
  AprobarTransferenciaInput,
  InformarTransferenciaInput,
  RechazarTransferenciaInput,
  RegistrarEfectivoInput,
  RegistrarTransferenciaRecibidaInput,
} from "./pago.schemas.js";
import type {
  Comprobante,
  DatosDePago,
  EstadoPago,
  FiltroTransferencias,
  Pago,
  PagoConCuota,
  PagoParaComprobante,
  TransferenciaConAlumno,
  TransferenciaEnRevision,
} from "./pago.types.js";

const MS_POR_HORA = 3_600_000;
const HORAS_PARA_REVISAR = 24;

function verificarMonto(monto: number, esperado: number, confirmado: boolean): void {
  if (monto !== esperado && !confirmado) throw new MontoDistintoError(esperado);
}

// Componente "Pago" de la vista arquitectónica (GestionCuotasYPagos): el cobro en efectivo
// (US-15), la transferencia que informa el alumno (US-16) y su revisión (US-17). Qué cuota se paga
// lo decide Cuota; la fachada los coordina.
export class PagoService implements IInfoPagos {
  constructor(
    private readonly repositorio: PagoRepository,
    private readonly profesoras: IInfoProfesores,
  ) {}

  // idProfesoraCobra sale de profesoraQueCobra, que la fachada consulta antes de preparar la cuota.
  prepararEfectivo(
    cuota: CuotaACobrar,
    input: RegistrarEfectivoInput,
    solicitante: Solicitante,
    idProfesoraCobra: number | null,
  ): DatosDePago {
    verificarMonto(input.monto, cuota.monto, input.confirmar_monto_distinto);
    const ahora = new Date();
    return {
      forma_pago: "EFECTIVO",
      estado: "CONFIRMADO",
      monto: input.monto,
      fecha_pago: ahora,
      titular_cuenta_origen: null,
      fecha_hora_transferencia: null,
      id_usuario_registra: solicitante.idUsuario,
      id_profesora_cobra: idProfesoraCobra,
      // Lo que cobró una profesora queda pendiente de rendición (US-19); lo que cobró la
      // propietaria ya está en sus manos.
      rendido: idProfesoraCobra === null,
      id_usuario_confirma: solicitante.idUsuario,
      fecha_confirmacion: ahora,
      observaciones: input.observaciones ?? null,
    };
  }

  // US-16: la informa el alumno o el tutor del menor, y queda pendiente hasta que la revise la
  // propietaria. El monto distinto se acepta acá y se confirma al aprobarla.
  // Quién paga se verifica antes con verificarTitular.
  async prepararTransferencia(
    cuota: CuotaACobrar,
    input: InformarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<DatosDePago> {
    await this.verificarQueNoEstaRepetida(cuota.inscripcion.alumno.id_alumno, input);
    return this.datosDeTransferencia(input, solicitante, "PENDIENTE");
  }

  // US-16: una transferencia la informa el alumno o el tutor del menor.
  verificarTitular(inscripcion: InscripcionACobrar, solicitante: Solicitante): void {
    const { alumno } = inscripcion;
    if (
      solicitante.idUsuario !== alumno.id_usuario &&
      solicitante.idUsuario !== alumno.id_usuario_responsable
    ) {
      throw new ForbiddenError("Solo podés informar transferencias tuyas o de un menor a tu cargo");
    }
  }

  // La carga la propietaria cuando ya vio el ingreso en su cuenta: así paga la primera cuota un
  // alumno nuevo, que todavía no puede entrar al sistema. Queda confirmada en el momento.
  async prepararTransferenciaRecibida(
    cuota: CuotaACobrar,
    input: RegistrarTransferenciaRecibidaInput,
    solicitante: Solicitante,
  ): Promise<DatosDePago> {
    verificarMonto(input.monto, cuota.monto, input.confirmar_monto_distinto);
    await this.verificarQueNoEstaRepetida(cuota.inscripcion.alumno.id_alumno, input);
    return this.datosDeTransferencia(input, solicitante, "CONFIRMADO");
  }

  async guardar(cuota: CuotaACobrar, datos: DatosDePago): Promise<Pago> {
    const pago = await this.repositorio.guardar(
      {
        idInscripcion: cuota.inscripcion.id_inscripcion,
        idCuotaExistente: cuota.idCuotaExistente,
        numeroCuota: cuota.numeroCuota,
        fechaVencimiento: cuota.fechaVencimiento,
        monto: cuota.monto,
      },
      datos,
    );
    if (!pago)
      throw new ConflictError(
        "Otro pago de esta inscripción se registró al mismo tiempo: volvé a intentarlo",
      );
    return pago;
  }

  // Valida la aprobación y devuelve la inscripción, para que la fachada dé el alta definitiva
  // antes de confirmar el pago.
  async prepararAprobacion(id: number, input: AprobarTransferenciaInput): Promise<number> {
    const pago = await this.transferenciaPendiente(id);
    verificarMonto(pago.monto, pago.cuota.monto, input.confirmar_monto_distinto);
    return pago.cuota.id_inscripcion;
  }

  confirmar(id: number, solicitante: Solicitante): Promise<Pago> {
    return this.resolver(id, "CONFIRMADO", solicitante, null);
  }

  async rechazar(id: number, input: RechazarTransferenciaInput, solicitante: Solicitante): Promise<Pago> {
    await this.transferenciaPendiente(id);
    return this.resolver(id, "RECHAZADO", solicitante, input.motivo_rechazo);
  }

  async listarTransferencias(filtro: FiltroTransferencias): Promise<TransferenciaEnRevision[]> {
    const ahora = Date.now();
    const transferencias = await this.repositorio.listarTransferencias(filtro);
    return transferencias.map((transferencia) => {
      const horas = Math.floor((ahora - transferencia.fecha_pago.getTime()) / MS_POR_HORA);
      return {
        ...transferencia,
        horas_desde_la_carga: horas,
        supera_24_horas: transferencia.estado === "PENDIENTE" && horas >= HORAS_PARA_REVISAR,
      };
    });
  }

  listarMisTransferencias(solicitante: Solicitante): Promise<TransferenciaConAlumno[]> {
    return this.repositorio.listarTransferenciasDeUsuario(solicitante.idUsuario);
  }

  // El comprobante lo ven la propietaria, quien registró el pago y el alumno o su tutor. A cualquier
  // otro se le responde igual que si el pago no existiera, para no revelar qué pagos hay.
  async obtenerComprobante(id: number, solicitante: Solicitante): Promise<Comprobante> {
    const pago = await this.repositorio.buscarParaComprobante(id);
    const interesados = pago
      ? [
          pago.id_usuario_registra,
          pago.cuota.inscripcion.alumno.id_usuario,
          pago.cuota.inscripcion.alumno.id_usuario_responsable,
        ]
      : [];
    if (!pago || (!solicitante.esPropietaria && !interesados.includes(solicitante.idUsuario))) {
      throw new NotFoundError("Pago no encontrado");
    }
    if (pago.estado !== "CONFIRMADO") throw new ConflictError("Solo un pago confirmado tiene comprobante");
    return armarComprobante(pago);
  }

  // US-15: cobra la profesora a cargo de la inscripción o la propietaria. Devuelve la profesora que
  // queda con el efectivo, o null si cobró la propietaria.
  async profesoraQueCobra(inscripcion: InscripcionACobrar, solicitante: Solicitante): Promise<number | null> {
    if (solicitante.esPropietaria) return null;
    const profesora = await this.profesoras.buscarPorUsuario(solicitante.idUsuario);
    if (!profesora || profesora.id_profesora !== inscripcion.id_profesora) {
      throw new ForbiddenError(
        "Solo la profesora a cargo de la inscripción o la propietaria registran el cobro",
      );
    }
    return profesora.id_profesora;
  }

  // US-17: la misma transferencia (mismo alumno, monto y día) informada dos veces.
  private async verificarQueNoEstaRepetida(
    idAlumno: number,
    input: InformarTransferenciaInput,
  ): Promise<void> {
    const dia = fechaActualArgentina(input.fecha_hora_transferencia).getTime();
    const fechas = await this.repositorio.fechasDeTransferenciasIguales(idAlumno, input.monto);
    if (fechas.some((fecha) => fechaActualArgentina(fecha).getTime() === dia)) {
      throw new ConflictError("Ya hay una transferencia de ese alumno por el mismo monto ese día");
    }
  }

  private datosDeTransferencia(
    input: InformarTransferenciaInput,
    solicitante: Solicitante,
    estado: "PENDIENTE" | "CONFIRMADO",
  ): DatosDePago {
    const ahora = new Date();
    const confirmada = estado === "CONFIRMADO";
    return {
      forma_pago: "TRANSFERENCIA",
      estado,
      monto: input.monto,
      // fecha_pago es cuándo se cargó: con ella se miden las 24 horas para revisarla (US-17).
      fecha_pago: ahora,
      titular_cuenta_origen: input.titular_cuenta_origen ?? null,
      fecha_hora_transferencia: input.fecha_hora_transferencia,
      id_usuario_registra: solicitante.idUsuario,
      id_profesora_cobra: null,
      rendido: true,
      id_usuario_confirma: confirmada ? solicitante.idUsuario : null,
      fecha_confirmacion: confirmada ? ahora : null,
      observaciones: input.observaciones ?? null,
    };
  }

  private async transferenciaPendiente(id: number): Promise<PagoConCuota> {
    const pago = await this.repositorio.buscarConCuota(id);
    if (!pago) throw new NotFoundError("Pago no encontrado");
    if (pago.forma_pago !== "TRANSFERENCIA" || pago.estado !== "PENDIENTE") {
      throw new ConflictError("Solo se aprueba o rechaza una transferencia pendiente");
    }
    return pago;
  }

  private async resolver(
    id: number,
    estado: EstadoPago,
    solicitante: Solicitante,
    motivoRechazo: string | null,
  ): Promise<Pago> {
    const pago = await this.repositorio.resolver(id, {
      estado,
      id_usuario_confirma: solicitante.idUsuario,
      fecha_confirmacion: new Date(),
      motivo_rechazo: motivoRechazo,
    });
    if (!pago) throw new ConflictError("La transferencia ya fue resuelta");
    return pago;
  }
}

function armarComprobante(pago: PagoParaComprobante): Comprobante {
  const { cuota, usuario_registra, profesora_cobra } = pago;
  return {
    numero: pago.id_pago,
    fecha: pago.fecha_pago,
    forma_pago: pago.forma_pago,
    monto: pago.monto,
    alumno: cuota.inscripcion.alumno.usuario,
    plan: cuota.inscripcion.plan.nombre,
    cuota: { numero: cuota.numero_cuota, vencimiento: cuota.fecha_vencimiento },
    registrado_por: usuario_registra,
    profesora_cobra: profesora_cobra?.usuario ?? null,
  };
}
