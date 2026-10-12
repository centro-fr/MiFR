import { Router } from "express";
import type { ILogicaDifusionPublica } from "./interface/i-logica-difusion-publica.js";
import { createPanelDisponibilidadRoutes } from "./panel-disponibilidad/panel-disponibilidad.routes.js";

// No recibe el ControlDeAcceso: nada de este subsistema exige sesión.
export function createDifusionPublicaRoutes(logica: ILogicaDifusionPublica): Router {
  const router = Router();

  router.use("/publico/actividades", createPanelDisponibilidadRoutes(logica));

  return router;
}
