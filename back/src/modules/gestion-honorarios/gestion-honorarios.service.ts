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
import type { FiltroTarifa, TarifaHonorario } from "./tarifa-honorario/tarifa-honorario.types.js";

// Fachada del subsistema GestionHonorarios: solo delega en el componente que corresponde.
export class GestionHonorariosService implements ILogicaHonorarios {
  constructor(
    private readonly tarifas: TarifaHonorarioService,
    private readonly liquidaciones: LiquidacionService,
  ) {}

  listarTarifas(filtro: FiltroTarifa): Promise<TarifaHonorario[]> {
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

  listarLiquidaciones(periodo: PeriodoLiquidacion): Promise<ResumenLiquidaciones> {
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
}
