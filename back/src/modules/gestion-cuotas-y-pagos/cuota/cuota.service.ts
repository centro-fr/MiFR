import { ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { Habilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { ICalculoHabilitacion } from "../../calculos-del-negocio/calculador-habilitacion/interface/i-calculo-habilitacion.js";
import type { ICalculoVencimiento } from "../../calculos-del-negocio/calculador-vencimiento-cuota/interface/i-calculo-vencimiento.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { IInfoParametros } from "../../gestion-servicio-entrenamiento/parametros-sistema/interface/i-info-parametros.js";
import type { IInfoPlanes } from "../../gestion-servicio-entrenamiento/plan/interface/i-info-planes.js";
import type { CuotaRepository } from "./cuota.repository.js";
import type { CuotaACobrar, SituacionDeCuotas } from "./cuota.types.js";
import type { IInfoCuotas } from "./interface/i-info-cuotas.js";

type CuotaDeLaSituacion = SituacionDeCuotas["cuotas"][number];

function estaConfirmada(cuota: CuotaDeLaSituacion): boolean {
  return cuota.estados_pagos.includes("CONFIRMADO");
}

function tienePagoPendiente(situacion: SituacionDeCuotas): boolean {
  return situacion.cuotas.some(({ estados_pagos }) => estados_pagos.includes("PENDIENTE"));
}

// Hasta cuándo está cubierto: el vencimiento más lejano entre las cuotas con un pago confirmado.
function vencimientoConfirmado(situacion: SituacionDeCuotas): Date | null {
  const confirmadas = situacion.cuotas
    .filter(estaConfirmada)
    .map(({ fecha_vencimiento }) => fecha_vencimiento);
  return confirmadas.length > 0 ? new Date(Math.max(...confirmadas.map(Number))) : null;
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

  async prepararCobro(idInscripcion: number): Promise<CuotaACobrar> {
    const inscripcion = await this.inscripciones.buscarPorId(idInscripcion);
    if (!inscripcion) throw new NotFoundError("Inscripción no encontrada");
    if (inscripcion.estado === "BAJA" || inscripcion.alumno.estado === "BAJA") {
      throw new ConflictError(
        "El alumno está dado de baja: hay que reactivarlo antes de registrarle un pago",
      );
    }

    const [situacion] = await this.repositorio.situacionDeInscripciones([idInscripcion]);
    if (tienePagoPendiente(situacion)) {
      throw new ConflictError("La inscripción tiene una transferencia pendiente de revisión");
    }

    const hoy = fechaActualArgentina();
    const precio = await this.planes.precioVigente(inscripcion.id_plan, hoy);
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
      monto: precio.precio,
    };
  }

  // US-07: el primer pago confirmado da el alta definitiva. activar es idempotente, así que se
  // llama en cada confirmación; con la inscripción dada de baja o sin cupo, rechaza el cobro.
  async darAltaDefinitiva(idInscripcion: number): Promise<void> {
    await this.inscripciones.activar(idInscripcion);
  }

  async habilitacionDeInscripciones(idsInscripciones: number[]): Promise<Map<number, Habilitacion>> {
    if (idsInscripciones.length === 0) return new Map();
    const [situaciones, vencidosPuedenAsistir] = await Promise.all([
      this.repositorio.situacionDeInscripciones(idsInscripciones),
      this.parametros.obtener("VENCIDOS_PUEDEN_ASISTIR"),
    ]);
    const hoy = fechaActualArgentina();
    return new Map(
      situaciones.map((situacion) => [
        situacion.id_inscripcion,
        this.habilitaciones.calcular({
          tipoPlan: situacion.tipo_plan,
          vencimiento: vencimientoConfirmado(situacion),
          diasGracia: situacion.dias_gracia,
          tienePagoPendiente: tienePagoPendiente(situacion),
          vencidosPuedenAsistir,
          hoy,
        }),
      ]),
    );
  }

  // Pago adelantado (US-15): un mensual al día sigue desde donde termina su cuota vigente. Una
  // clase suelta cubre siempre el día del cobro.
  private desdeCuandoCubre(situacion: SituacionDeCuotas, hoy: Date): Date {
    const vigente = vencimientoConfirmado(situacion);
    return situacion.tipo_plan === "MENSUAL" && vigente !== null && vigente > hoy ? vigente : hoy;
  }
}
