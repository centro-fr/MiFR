import { registrarError } from "../../shared/utils/registro-errores.js";
import type { CierreMensualHonorariosService } from "./cierre-mensual-honorarios/cierre-mensual-honorarios.service.js";
import type { ILogicaHonorarios } from "./interface/i-logica-honorarios.js";
import type { LiquidacionService } from "./liquidacion/liquidacion.service.js";
import type {
  LiquidacionDetallada,
  PeriodoLiquidacion,
  ResultadoGeneracion,
  ResumenLiquidaciones,
} from "./liquidacion/liquidacion.types.js";
import type { CerrarTarifaInput, RegistrarTarifaInput } from "./tarifa-honorario/tarifa-honorario.schemas.js";
import type { TarifaHonorarioService } from "./tarifa-honorario/tarifa-honorario.service.js";
import type {
  FiltroTarifa,
  TarifaHonorario,
  TarifaHonorarioConPlan,
} from "./tarifa-honorario/tarifa-honorario.types.js";

// Fachada del subsistema GestionHonorarios: delega en el componente que corresponde. Al listar las
// liquidaciones, antes cierra el mes anterior si ya le tocaba y el proceso dormido no llegó a hacerlo.
export class GestionHonorariosService implements ILogicaHonorarios {
  constructor(
    private readonly tarifas: TarifaHonorarioService,
    private readonly liquidaciones: LiquidacionService,
    private readonly cierreMensual: CierreMensualHonorariosService,
  ) {}

  listarTarifas(filtro: FiltroTarifa): Promise<TarifaHonorarioConPlan[]> {
    return this.tarifas.listar(filtro);
  }

  registrarTarifa(input: RegistrarTarifaInput): Promise<TarifaHonorario> {
    return this.tarifas.registrar(input);
  }

  cerrarTarifa(id: number, fechaHasta: CerrarTarifaInput["fecha_hasta"]): Promise<TarifaHonorario> {
    return this.tarifas.cerrar(id, fechaHasta);
  }

  generarLiquidaciones(periodo: PeriodoLiquidacion): Promise<ResultadoGeneracion> {
    return this.liquidaciones.generar(periodo);
  }

  async listarLiquidaciones(periodo: PeriodoLiquidacion): Promise<ResumenLiquidaciones> {
    await this.cerrarMesPendiente();
    return this.liquidaciones.listar(periodo);
  }

  obtenerLiquidacion(id: number): Promise<LiquidacionDetallada> {
    return this.liquidaciones.obtener(id);
  }

  cerrarLiquidacion(id: number): Promise<LiquidacionDetallada> {
    return this.liquidaciones.cerrar(id);
  }

  pagarLiquidacion(id: number): Promise<LiquidacionDetallada> {
    return this.liquidaciones.pagar(id);
  }

  // Si el cierre falla, el listado igual responde: el intervalo lo vuelve a intentar.
  private async cerrarMesPendiente(): Promise<void> {
    try {
      await this.cierreMensual.cerrarMesAnterior();
    } catch (error) {
      registrarError("CIERRE_MENSUAL_HONORARIOS", error);
    }
  }
}
