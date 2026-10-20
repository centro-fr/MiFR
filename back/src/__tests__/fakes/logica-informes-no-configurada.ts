import type { ILogicaInformes } from "../../modules/reportes/interface/i-logica-informes.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de informes no está configurada para este test");
}

export const logicaInformesNoConfigurada = {
  listarAlumnosInactivos: operacionNoConfigurada,
  registrarSeguimientoInactividad: operacionNoConfigurada,
  quitarSeguimientoInactividad: operacionNoConfigurada,
  informeCuotasVencidas: operacionNoConfigurada,
  informeCobranza: operacionNoConfigurada,
  estadisticasPlanes: operacionNoConfigurada,
  estadisticasInscripciones: operacionNoConfigurada,
} satisfies ILogicaInformes;
