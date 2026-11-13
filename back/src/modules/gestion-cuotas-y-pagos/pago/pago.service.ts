import {
  ConflictError,
  ForbiddenError,
  MontoDistintoError,
  NotFoundError,
  ValidationError,
} from "../../../shared/errors/app-error.js";
import { fechaActualArgentina, rangoDeDiasArgentinos } from "../../../shared/utils/fecha-argentina.js";
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
  RendirLoteInput,
} from "./pago.schemas.js";
import type {
  CobroEnEfectivo,
  CobroSinRendir,
  Comprobante,
  DatosDePago,
  EfectivoPendiente,
  EstadoPago,
  FiltroCobranzaService,
  FiltroEfectivo,
  FiltroEfectivoEnInstantes,
  FiltroTransferencias,
  MotivoSinRendir,
  PaginaRendiciones,
  PaginaTransferencias,
  Pago,
  PagoConCuota,
  PagoParaComprobante,
  ResultadoCobranza,
  ResultadoRendicion,
  TransferenciaConAlumno,
  TipoTransferencia,
  TransferenciaEnRevision,
  TransferenciaParaRevisar,
} from "./pago.types.js";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";

const MS_POR_HORA = 3_600_000;
const MS_POR_DIA = 24 * MS_POR_HORA;
const HORAS_PARA_REVISAR = 24;

function enInstantes({ id_profesora, desde, hasta }: FiltroEfectivo): FiltroEfectivoEnInstantes {
  return { id_profesora, ...rangoDeDiasArgentinos(desde, hasta) };
}

// Días de Argentina entre el cobro y hoy: un cobro de anoche a las 22:00 lleva un día, no cero.
function conDiasSinRendir({ fecha_rendicion: _, ...cobro }: CobroEnEfectivo, hoy: Date): CobroSinRendir {
  const dias = Math.round((hoy.getTime() - fechaActualArgentina(cobro.fecha_pago).getTime()) / MS_POR_DIA);
  return { ...cobro, dias_sin_rendir: dias };
}

export const TOPE_FILTRO_TIPO_TRANSFERENCIA = 500;

// US-17: la primera cuota da el alta. Las siguientes de un mensual se pagaron vencidas si se
// cargaron después del vencimiento de la anterior: el mismo criterio con el que Cuota decide desde
// cuándo cubre la nueva. Una clase suelta no se paga por adelantado, así que siempre renueva.
function tipoDe(transferencia: TransferenciaParaRevisar): TipoTransferencia {
  if (transferencia.numero_cuota === 1) return "PRIMERA_CUOTA";
  const { tipo_plan, vencimiento_anterior, fecha_pago } = transferencia;
  const vencida =
    tipo_plan === "MENSUAL" &&
    vencimiento_anterior !== null &&
    fechaActualArgentina(fecha_pago) > vencimiento_anterior;
  return vencida ? "CUOTA_VENCIDA" : "RENOVACION";
}

function enRevision(transferencia: TransferenciaParaRevisar, ahora: number): TransferenciaEnRevision {
  const { tipo_plan: _, numero_cuota: __, vencimiento_anterior: ___, ...datos } = transferencia;
  const horas = Math.floor((ahora - transferencia.fecha_pago.getTime()) / MS_POR_HORA);
  return {
    ...datos,
    tipo: tipoDe(transferencia),
    horas_desde_la_carga: horas,
    supera_24_horas: transferencia.estado === "PENDIENTE" && horas >= HORAS_PARA_REVISAR,
  };
}

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

  // US-16: la informa la profesora a cargo o la propietaria, y queda pendiente hasta que la propietaria
  // la vea en su cuenta. El monto distinto se acepta acá y se confirma al aprobarla.
  // Quién la informa se verifica antes con profesoraQueCobra.
  async prepararTransferencia(
    cuota: CuotaACobrar,
    input: InformarTransferenciaInput,
    solicitante: Solicitante,
  ): Promise<DatosDePago> {
    await this.verificarQueNoEstaRepetida(cuota.inscripcion.alumno.id_alumno, input);
    return this.datosDeTransferencia(input, solicitante, "PENDIENTE");
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

  // Sin tipo se pagina en la base. El tipo se calcula y no se guarda: con ese filtro se calcula para
  // las que cumplen los otros filtros y se pagina en memoria, con tope, como el estado de cuota de
  // los alumnos.
  async listarTransferencias({
    tipo,
    orden,
    limit,
    offset,
    desde,
    hasta,
    ...resto
  }: FiltroTransferencias): Promise<PaginaTransferencias> {
    const filtro = { ...resto, ...rangoDeDiasArgentinos(desde, hasta) };
    const ahora = Date.now();
    if (tipo === undefined) {
      const [transferencias, total] = await Promise.all([
        this.repositorio.listarParaRevisar(filtro, orden, { limit, offset }),
        this.repositorio.contarTransferencias(filtro),
      ]);
      return { datos: transferencias.map((t) => enRevision(t, ahora)), total, limit, offset };
    }

    const candidatas = await this.repositorio.listarParaRevisar(filtro, orden, {
      limit: TOPE_FILTRO_TIPO_TRANSFERENCIA + 1,
      offset: 0,
    });
    if (candidatas.length > TOPE_FILTRO_TIPO_TRANSFERENCIA) {
      throw new ValidationError(
        `Hay más de ${TOPE_FILTRO_TIPO_TRANSFERENCIA} transferencias para filtrar por tipo: acote la búsqueda con otro filtro`,
      );
    }
    const coinciden = candidatas.filter((transferencia) => tipoDe(transferencia) === tipo);
    return {
      datos: coinciden.slice(offset, offset + limit).map((t) => enRevision(t, ahora)),
      total: coinciden.length,
      limit,
      offset,
    };
  }

  // US-19: lo que cada profesora tiene que rendir: los totales completos y una página del detalle.
  async efectivoPendiente(
    filtro: FiltroEfectivo,
    pagina: { limit: number; offset: number },
  ): Promise<EfectivoPendiente> {
    const enRango = enInstantes(filtro);
    const [totales, cobros] = await Promise.all([
      this.repositorio.totalesSinRendir(enRango),
      this.repositorio.listarSinRendir(enRango, pagina),
    ]);
    const hoy = fechaActualArgentina();
    return {
      ...sumar(totales),
      profesoras: totales,
      cobros: cobros.map((cobro) => conDiasSinRendir(cobro, hoy)),
      ...pagina,
    };
  }

  async obtenerCobranza(
    { desde, hasta, forma_pago, id_profesora }: FiltroCobranzaService,
    paginacion: Paginacion,
  ): Promise<ResultadoCobranza> {
    const { inicio, fin } = rangoDeDiasArgentinos(desde, hasta);
    return this.repositorio.obtenerCobranza(
      {
        inicio,
        fin,
        forma_pago,
        id_profesora,
      },
      paginacion,
    );
  }

  async listarRendiciones(
    filtro: FiltroEfectivo,
    pagina: { limit: number; offset: number },
  ): Promise<PaginaRendiciones> {
    const { datos, total } = await this.repositorio.listarRendidos(enInstantes(filtro), pagina);
    return { datos, total, ...pagina };
  }

  // Rendir uno que no se puede responde con el motivo: el lote, en cambio, saltea y sigue.
  async rendir(id: number): Promise<ResultadoRendicion> {
    const resultado = await this.rendirLote({ ids_pagos: [id] });
    const [salteado] = resultado.salteados;
    if (salteado?.motivo === "NO_EXISTE") throw new NotFoundError("Pago no encontrado");
    if (salteado?.motivo === "YA_RENDIDO") throw new ConflictError("El cobro ya se rindió");
    if (salteado) {
      throw new ConflictError("Solo se rinden cobros en efectivo confirmados que cobró una profesora");
    }
    return resultado;
  }

  async rendirLote(input: RendirLoteInput): Promise<ResultadoRendicion> {
    const ids =
      "ids_pagos" in input
        ? input.ids_pagos
        : await this.repositorio.idsSinRendirDeProfesora(input.id_profesora);
    if (ids.length === 0) return { rendidos: [], cantidad: 0, total: 0, salteados: [] };
    const rendidos = await this.repositorio.rendir(ids, new Date());
    const deLosRendidos = new Set(rendidos.map(({ id_pago }) => id_pago));
    const sinRendir = ids.filter((id) => !deLosRendidos.has(id));
    const motivos: Map<number, MotivoSinRendir> =
      sinRendir.length > 0 ? await this.repositorio.motivosSinRendir(sinRendir) : new Map();
    return {
      rendidos: [...deLosRendidos],
      cantidad: rendidos.length,
      total: redondear(rendidos.reduce((suma, { monto }) => suma + monto, 0)),
      salteados: sinRendir.map((id_pago) => ({ id_pago, motivo: motivos.get(id_pago) as MotivoSinRendir })),
    };
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

// La cuota guarda lo que había que cobrar ese día, ya con el descuento (US-13): la diferencia con el
// precio de lista es lo que se descontó. Sin promoción en la inscripción no hay descuento que mostrar.
function armarComprobante(pago: PagoParaComprobante): Comprobante {
  const { cuota, usuario_registra, profesora_cobra, precio_lista } = pago;
  const { promocion } = cuota.inscripcion;
  const descuento =
    promocion && precio_lista !== null ? Math.max(0, redondear(precio_lista - cuota.monto)) : 0;
  return {
    numero: pago.id_pago,
    fecha: pago.fecha_pago,
    forma_pago: pago.forma_pago,
    monto: pago.monto,
    alumno: cuota.inscripcion.alumno.usuario,
    plan: cuota.inscripcion.plan.nombre,
    cuota: { numero: cuota.numero_cuota, vencimiento: cuota.fecha_vencimiento, monto: cuota.monto },
    precio_lista,
    descuento,
    promocion:
      descuento > 0 && promocion
        ? {
            codigo: promocion.codigo,
            nombre: promocion.nombre,
            tipo_descuento: promocion.tipo_descuento,
            valor: Number(promocion.valor),
          }
        : null,
    registrado_por: usuario_registra,
    profesora_cobra: profesora_cobra?.usuario ?? null,
  };
}

// Los montos son NUMERIC(10,2): la suma en number se redondea a centavos para no arrastrar 0,000001.
function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}

function sumar(totales: { cantidad: number; total: number }[]): { cantidad: number; total: number } {
  return {
    cantidad: totales.reduce((suma, { cantidad }) => suma + cantidad, 0),
    total: redondear(totales.reduce((suma, { total }) => suma + total, 0)),
  };
}
