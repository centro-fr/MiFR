import type { ILogicaHonorarios } from "../../modules/gestion-honorarios/interface/i-logica-honorarios.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de honorarios no está configurada para este test");
}

export const logicaHonorariosNoConfigurada = {
  listarTarifas: operacionNoConfigurada,
  registrarTarifa: operacionNoConfigurada,
  cerrarTarifa: operacionNoConfigurada,
  generarLiquidaciones: operacionNoConfigurada,
  listarLiquidaciones: operacionNoConfigurada,
  obtenerLiquidacion: operacionNoConfigurada,
  cerrarLiquidacion: operacionNoConfigurada,
  pagarLiquidacion: operacionNoConfigurada,
} satisfies ILogicaHonorarios;
