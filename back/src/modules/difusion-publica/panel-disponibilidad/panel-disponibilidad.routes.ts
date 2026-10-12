import { Router } from "express";
import type { ILogicaPanelDisponibilidad } from "../interface/i-logica-difusion-publica.js";
import { createPanelDisponibilidadController } from "./panel-disponibilidad.controller.js";

// US-32: las actividades del centro son públicas, sin sesión ni permiso. Solo lectura.
export function createPanelDisponibilidadRoutes(logica: ILogicaPanelDisponibilidad): Router {
  const router = Router();
  const controller = createPanelDisponibilidadController(logica);

  router.get("/", controller.consultar);

  return router;
}
