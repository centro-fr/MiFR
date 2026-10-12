import type { ILogicaDifusionPublica } from "../../modules/difusion-publica/interface/i-logica-difusion-publica.js";

async function operacionNoConfigurada(): Promise<never> {
  throw new Error("La lógica de difusión pública no está configurada para este test");
}

export const logicaDifusionPublicaNoConfigurada = {
  consultarDisponibilidad: operacionNoConfigurada,
} satisfies ILogicaDifusionPublica;
