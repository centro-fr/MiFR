import { ConflictError, NotFoundError, ValidationError } from "../../../shared/errors/app-error.js";
import { fechaActualArgentina } from "../../../shared/utils/fecha-argentina.js";
import type { ICalculoHonorarios } from "../../calculos-del-negocio/calculador-honorarios/interface/i-calculo-honorarios.js";
import type { IInfoCuotas } from "../../gestion-cuotas-y-pagos/cuota/interface/i-info-cuotas.js";
import type { IInfoClases } from "../../gestion-inscripciones-y-clases/clase/interface/i-info-clases.js";
import type { IInfoInscripciones } from "../../gestion-inscripciones-y-clases/inscripcion/interface/i-info-inscripciones.js";
import type { InscripcionACargo } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";
import type { IInfoProfesores } from "../../gestion-personas/profesor/interface/i-info-profesores.js";
import type { TarifaHonorarioService } from "../tarifa-honorario/tarifa-honorario.service.js";
import type { LiquidacionRepository } from "./liquidacion.repository.js";
import type {
  EstadoLiquidacion,
  LiquidacionConDesglose,
  LiquidacionDetallada,
  PeriodoLiquidacion,
  ResultadoGeneracion,
  ResumenLiquidaciones,
} from "./liquidacion.types.js";

// Para saber si una baja llegó a pagar alguna vez se mira todo lo cobrado hasta el fin del período.
const DESDE_SIEMPRE = new Date("2000-01-01T00:00:00Z");

// Se suma en centavos para que 0,10 + 0,20 dé 0,30 y no 0,30000000000000004.
function sumarEnCentavos(montos: number[]): number {
  return montos.reduce((total, monto) => total + Math.round(monto * 100), 0) / 100;
}

function resumir(periodo: string, liquidaciones: LiquidacionConDesglose[]): ResumenLiquidaciones {
  return {
    periodo,
    total_general: sumarEnCentavos(liquidaciones.map(({ monto_total }) => monto_total)),
    liquidaciones,
  };
}

// US-23: junta los datos del mes, llama al calculador puro y guarda el resultado. Una liquidación
// CERRADA es una foto: se genera y se recalcula solo mientras es BORRADOR.
export class LiquidacionService {
  constructor(
    private readonly repositorio: LiquidacionRepository,
    private readonly tarifas: Pick<TarifaHonorarioService, "listar">,
    private readonly calculador: ICalculoHonorarios,
    private readonly inscripciones: Pick<IInfoInscripciones, "aCargoEnPeriodo">,
    private readonly clases: Pick<IInfoClases, "listarSuplidasEnPeriodo">,
    private readonly cuotas: Pick<IInfoCuotas, "cobradoEnPeriodo">,
    private readonly profesoras: Pick<IInfoProfesores, "listar">,
  ) {}

  async generar({ periodo, desde, hasta }: PeriodoLiquidacion): Promise<ResultadoGeneracion> {
    if (desde.getTime() > fechaActualArgentina().getTime()) {
      throw new ValidationError("El período todavía no empezó");
    }

    const [aCargo, suplencias, tarifas, profesoras] = await Promise.all([
      this.inscripciones.aCargoEnPeriodo(desde, hasta),
      this.clases.listarSuplidasEnPeriodo(desde, hasta),
      this.tarifas.listar({}),
      this.profesoras.listar(),
    ]);
    const inscripciones = await this.quitarBajasQueNuncaPagaron(aCargo, hasta);
    const cobradoEnElPeriodo = await this.cuotas.cobradoEnPeriodo(
      inscripciones.map(({ id_inscripcion }) => id_inscripcion),
      desde,
      hasta,
    );

    const { detalles, advertencias, totalesPorProfesora } = this.calculador.calcular({
      finDelPeriodo: hasta,
      inscripciones,
      cobradoEnElPeriodo,
      suplencias,
      tarifas,
    });

    // Cada profesora activa tiene su liquidación, aunque sea en 0; también la que se dio de baja
    // pero tuvo movimientos en el mes.
    const ids = new Set([
      ...profesoras.map(({ id_profesora }) => id_profesora),
      ...totalesPorProfesora.keys(),
    ]);
    const borradores = [...ids].map((idProfesora) => {
      const detallesProfesora = detalles
        .filter(({ id_profesora }) => id_profesora === idProfesora)
        .map(({ id_profesora: _profesora, ...detalle }) => detalle);
      const montoTotalCalculado = totalesPorProfesora.get(idProfesora) ?? 0;
      const sumaDetalles = sumarEnCentavos(detallesProfesora.map(({ monto }) => monto));

      // Si el calculador devuelve un total que no es la suma de sus detalles, es un error interno: no se guarda
      // una liquidación que no cierra.
      if (Math.round(montoTotalCalculado * 100) !== Math.round(sumaDetalles * 100)) {
        throw new Error(
          `El total de la liquidación de la profesora ${idProfesora} no coincide con la suma de sus detalles`,
        );
      }

      return {
        id_profesora: idProfesora,
        monto_total: montoTotalCalculado,
        detalles: detallesProfesora,
      };
    });

    const { liquidaciones, sin_recalcular } = await this.repositorio.guardarBorradores(
      desde,
      hasta,
      borradores,
    );
    return { ...resumir(periodo, liquidaciones), advertencias, sin_recalcular };
  }

  async listar({ periodo, desde, hasta }: PeriodoLiquidacion): Promise<ResumenLiquidaciones> {
    return resumir(periodo, await this.repositorio.listarPorPeriodo(desde, hasta));
  }

  async obtener(id: number): Promise<LiquidacionDetallada> {
    const liquidacion = await this.repositorio.buscarPorId(id);
    if (!liquidacion) throw new NotFoundError("Liquidación no encontrada");
    return liquidacion;
  }

  cerrar(id: number): Promise<LiquidacionDetallada> {
    return this.cambiarEstado(id, "BORRADOR", "CERRADA", "cerrar una liquidación en BORRADOR");
  }

  pagar(id: number): Promise<LiquidacionDetallada> {
    return this.cambiarEstado(id, "CERRADA", "PAGADA", "pagar una liquidación CERRADA");
  }

  // El DER no guarda cuándo se activó una inscripción: una BAJA puede ser una pre-inscripción que
  // nunca se pagó. Esas no estuvieron a cargo de nadie, así que se distinguen por lo cobrado.
  private async quitarBajasQueNuncaPagaron(
    aCargo: InscripcionACargo[],
    hasta: Date,
  ): Promise<InscripcionACargo[]> {
    const bajas = aCargo.filter(({ estado }) => estado === "BAJA");
    if (bajas.length === 0) return aCargo;

    const cobrado = await this.cuotas.cobradoEnPeriodo(
      bajas.map(({ id_inscripcion }) => id_inscripcion),
      DESDE_SIEMPRE,
      hasta,
    );
    return aCargo.filter(
      ({ estado, id_inscripcion }) => estado !== "BAJA" || (cobrado.get(id_inscripcion) ?? 0) > 0,
    );
  }

  private async cambiarEstado(
    id: number,
    desde: EstadoLiquidacion,
    hacia: EstadoLiquidacion,
    accion: string,
  ): Promise<LiquidacionDetallada> {
    const liquidacion = await this.obtener(id);
    if (liquidacion.estado !== desde) {
      throw new ConflictError(`Solo se puede ${accion}; esta está ${liquidacion.estado}`);
    }
    if (!(await this.repositorio.transicionar(id, desde, hacia))) {
      throw new ConflictError("La liquidación cambió de estado mientras se procesaba");
    }
    return this.obtener(id);
  }
}
