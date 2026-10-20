import type {
  CerrarTarifaInput,
  RegistrarTarifaInput,
} from "../tarifa-honorario/tarifa-honorario.schemas.js";
import type { FiltroTarifa, TarifaHonorario } from "../tarifa-honorario/tarifa-honorario.types.js";
import type {
  LiquidacionDetallada,
  PeriodoLiquidacion,
  ResultadoGeneracion,
  ResumenLiquidaciones,
} from "../liquidacion/liquidacion.types.js";
// Las partes de ILogicaHonorarios, una por componente: cada controller depende solo de la suya. No
// son interfaces nuevas del diagrama; la que provee el subsistema es la unión.

// US-23: las tarifas que cobra cada profesora. Solo la propietaria las ve y las cambia.
export interface ILogicaTarifasHonorario {
  listarTarifas(filtro: FiltroTarifa): Promise<TarifaHonorario[]>;
  registrarTarifa(input: RegistrarTarifaInput): Promise<TarifaHonorario>;
  cerrarTarifa(id: number, fechaHasta: CerrarTarifaInput["fecha_hasta"]): Promise<TarifaHonorario>;
}

// Interfaz del subsistema GestionHonorarios en la vista arquitectónica.
export interface ILogicaHonorarios extends ILogicaTarifasHonorario, ILogicaLiquidaciones {}

// US-23: las liquidaciones mensuales de honorarios. Solo la propietaria las ve, las cierra y las paga.
export interface ILogicaLiquidaciones {
  generarLiquidaciones(periodo: PeriodoLiquidacion): Promise<ResultadoGeneracion>;
  listarLiquidaciones(periodo: PeriodoLiquidacion): Promise<ResumenLiquidaciones>;
  obtenerLiquidacion(id: number): Promise<LiquidacionDetallada>;
  cerrarLiquidacion(id: number): Promise<LiquidacionDetallada>;
  pagarLiquidacion(id: number): Promise<LiquidacionDetallada>;
}