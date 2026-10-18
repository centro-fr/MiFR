import { ConflictError } from "../../../shared/errors/app-error.js";
import type { EstadoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import { fechaActualArgentina, rangoDeDiasArgentinos } from "../../../shared/utils/fecha-argentina.js";
import type { ICalculoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.js";
import type { ICalculoVencimiento } from "../../calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.js";
import type { InscripcionACobrar } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoPlanes } from "../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { CuotaRepository } from "./cuota.repository.js";
import type {
  CuotaACobrar,
  CuotaDelHistorial,
  CuotaParaAviso,
  HabilitacionDeInscripcion,
  SituacionParaAviso,
  SituacionDeCuotas,
  TipoAvisoCuota,
} from "./cuota.types.js";
import type { IInfoCuotas } from "./interface/i-info-cuotas.js";

type CuotaDeLaSituacion = SituacionDeCuotas["cuotas"][number];

const UN_DIA_EN_MS = 24 * 60 * 60 * 1000;

function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * UN_DIA_EN_MS);
}

function estaConfirmada(cuota: CuotaDeLaSituacion): boolean {
  return cuota.estados_pagos.includes("CONFIRMADO");
}

function tienePagoPendiente(situacion: SituacionDeCuotas): boolean {
  return situacion.cuotas.some(({ estados_pagos }) => estados_pagos.includes("PENDIENTE"));
}

// La cuota que cubre hasta más lejos entre las que tienen un pago confirmado.
function cuotaVigente(situacion: SituacionDeCuotas): CuotaDeLaSituacion | null {
  return situacion.cuotas
    .filter(estaConfirmada)
    .reduce<CuotaDeLaSituacion | null>(
      (vigente, cuota) =>
        vigente === null || cuota.fecha_vencimiento > vigente.fecha_vencimiento ? cuota : vigente,
      null,
    );
}

// Hasta cuándo está cubierto.
function vencimientoConfirmado(situacion: SituacionDeCuotas): Date | null {
  return cuotaVigente(situacion)?.fecha_vencimiento ?? null;
}

// La última cuota se reusa si no tiene pagos confirmados ni pendientes, como la que queda después
// de rechazar una transferencia: así no quedan números de cuota salteados.
function cuotaSinPagar(situacion: SituacionDeCuotas): CuotaDeLaSituacion | null {
  const [ultima] = situacion.cuotas;
  return ultima && ultima.estados_pagos.every((estado) => estado === "RECHAZADO") ? ultima : null;
}

// Componente "Cuota" de la vista arquitectónica (GestionCuotasYPagos). La cuota se genera al
// cobrarla (decisión de SPRINT-3.md): cubre desde el pago, o desde el vencimiento vigente si el
// alumno paga por adelantado, hasta el vencimiento que calcula ICalculoVencimiento. No guarda si
// está paga o vencida: eso lo calcula ICalculoHabilitacion al consultarla.
export class CuotaService implements IInfoCuotas {
  constructor(
    private readonly repositorio: CuotaRepository,
    private readonly inscripciones: IInfoInscripciones,
    private readonly planes: IInfoPlanes,
    private readonly vencimientos: ICalculoVencimiento,
    private readonly habilitaciones: ICalculoHabilitacion,
    private readonly parametros: IInfoParametros,
  ) {}

  buscarInscripcion(idInscripcion: number): Promise<InscripcionACobrar | null> {
    return this.inscripciones.buscarParaCobro(idInscripcion);
  }

  // Recibe la inscripción ya resuelta: la fachada verifica antes quién paga, para que estos errores
  // (baja, transferencia pendiente, precio) no cuenten nada de una inscripción ajena.
  async prepararCobro(inscripcion: InscripcionACobrar): Promise<CuotaACobrar> {
    if (inscripcion.estado === "BAJA" || inscripcion.alumno.estado === "BAJA") {
      throw new ConflictError(
        "El alumno está dado de baja: hay que reactivarlo antes de registrarle un pago",
      );
    }

    const hoy = fechaActualArgentina();
    const [[situacion], precio] = await Promise.all([
      this.repositorio.situacionDeInscripciones([inscripcion.id_inscripcion]),
      this.planes.precioACobrar(inscripcion.id_plan, hoy, inscripcion.id_promocion),
    ]);
    if (tienePagoPendiente(situacion)) {
      throw new ConflictError("La inscripción tiene una transferencia pendiente de revisión");
    }
    if (!precio) throw new ConflictError("El plan no tiene un precio vigente hoy");

    const sinPagar = cuotaSinPagar(situacion);
    return {
      inscripcion,
      idCuotaExistente: sinPagar?.id_cuota ?? null,
      numeroCuota: sinPagar?.numero_cuota ?? (situacion.cuotas[0]?.numero_cuota ?? 0) + 1,
      fechaVencimiento: this.vencimientos.calcularVencimiento({
        tipoPlan: situacion.tipo_plan,
        desde: this.desdeCuandoCubre(situacion, hoy),
      }),
      monto: precio.monto,
    };
  }

  // US-07: el primer pago confirmado da el alta definitiva. Con la inscripción ya activa no hace
  // nada, así que se llama en cada confirmación; con la inscripción dada de baja o sin cupo, rechaza el cobro.
  async darAltaDefinitiva(idInscripcion: number): Promise<void> {
    await this.inscripciones.activar(idInscripcion);
  }

  async habilitacionDeInscripciones(
    idsInscripciones: number[],
  ): Promise<Map<number, HabilitacionDeInscripcion>> {
    if (idsInscripciones.length === 0) return new Map();
    const [situaciones, vencidosPuedenAsistir] = await Promise.all([
      this.repositorio.situacionDeInscripciones(idsInscripciones),
      this.parametros.obtener("VENCIDOS_PUEDEN_ASISTIR"),
    ]);
    const hoy = fechaActualArgentina();
    return new Map(
      situaciones.map((situacion) => {
        const pendiente = tienePagoPendiente(situacion);
        const habilitacion = this.habilitaciones.calcular({
          tipoPlan: situacion.tipo_plan,
          vencimiento: vencimientoConfirmado(situacion),
          diasGracia: situacion.dias_gracia,
          tienePagoPendiente: pendiente,
          vencidosPuedenAsistir,
          hoy: situacion.fecha_baja ? fechaActualArgentina(situacion.fecha_baja) : hoy,
        });
        return [situacion.id_inscripcion, { ...habilitacion, tienePagoPendiente: pendiente }];
      }),
    );
  }

  // Pago adelantado (US-15): un mensual al día sigue el día después del vencimiento de su cuota
  // vigente, para que ningún día quede cubierto por dos cuotas. El vencimiento cuenta como cubierto,
  // así que quien paga el mismo día en que vence también sigue desde el siguiente. Una clase suelta
  // cubre siempre el día del cobro.
  private desdeCuandoCubre(situacion: SituacionDeCuotas, hoy: Date): Date {
    const vigente = vencimientoConfirmado(situacion);
    if (situacion.tipo_plan !== "MENSUAL" || vigente === null || vigente < hoy) return hoy;
    return new Date(vigente.getTime() + UN_DIA_EN_MS);
  }

  historialDeAlumno(idAlumno: number): Promise<CuotaDelHistorial[]> {
    return this.repositorio.historialDeAlumno(idAlumno);
  }

  tuvoPagoConfirmado(idAlumno: number): Promise<boolean> {
    return this.repositorio.tuvoPagoConfirmado(idAlumno);
  }

  async cobradoEnPeriodo(idsInscripciones: number[], desde: Date, hasta: Date): Promise<Map<number, number>> {
    if (idsInscripciones.length === 0) return new Map();
    const { inicio, fin } = rangoDeDiasArgentinos(desde, hasta);
    const cobrado = await this.repositorio.cobradoEnPeriodo(idsInscripciones, inicio, fin);
    return new Map(idsInscripciones.map((id) => [id, cobrado.get(id) ?? 0]));
  }

  async paraAvisoDeVencimiento(fecha: Date, diasPrevios: number): Promise<CuotaParaAviso[]> {
    const situaciones = await this.repositorio.situacionParaAvisos(sumarDias(fecha, diasPrevios));
    return situaciones.flatMap((situacion) => {
      const aviso = this.avisoPara(situacion, fecha, diasPrevios);
      return aviso ? [aviso] : [];
    });
  }

  private avisoPara(situacion: SituacionParaAviso, fecha: Date, diasPrevios: number): CuotaParaAviso | null {
    const cuota = cuotaVigente(situacion);
    if (cuota === null || tienePagoPendiente(situacion)) return null;
    const vencimiento = cuota.fecha_vencimiento;
    const { estado, diasRestantes } = this.habilitaciones.calcular({
      tipoPlan: situacion.tipo_plan,
      vencimiento,
      diasGracia: situacion.dias_gracia,
      tienePagoPendiente: false,
      vencidosPuedenAsistir: true,
      hoy: fecha,
    });
    const tipo = tipoDeAviso(estado, diasRestantes, diasPrevios);
    if (tipo === null) return null;
    return {
      tipo,
      id_cuota: cuota.id_cuota,
      id_inscripcion: situacion.id_inscripcion,
      fecha_vencimiento: vencimiento,
      nombre_plan: situacion.nombre_plan,
      alumno: situacion.alumno,
    };
  }
}

function tipoDeAviso(
  estado: EstadoHabilitacion,
  diasRestantes: number | null,
  diasPrevios: number,
): TipoAvisoCuota | null {
  if (estado === "VENCIDA") return "CUOTA_VENCIDA";
  if (estado === "AL_DIA" && diasRestantes !== null && diasRestantes <= diasPrevios) {
    return "CUOTA_POR_VENCER";
  }
  return null;
}
