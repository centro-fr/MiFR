import type { ILogicaInsignias } from "../../modules/gestion-insignias/interface/i-logica-insignias.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de insignias no está configurada para este test");
}

export const logicaInsigniasNoConfigurada = {
  obtenerFichaInsignias: operacionNoConfigurada,
  consultarRankingAsistencia: operacionNoConfigurada,
} satisfies ILogicaInsignias;
