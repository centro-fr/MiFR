import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import type { ILogicaRutinasYProgreso } from "./interface/i-logica-rutinas-y-progreso.js";
import { createProgresoRoutes } from "./progreso/progreso.routes.js";
import { createRutinaRoutes } from "./rutina/rutina.routes.js";

export function createGestionRutinasYProgresoRoutes(
  logica: ILogicaRutinasYProgreso,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();

  router.use(createRutinaRoutes(logica, acceso));
  router.use(createProgresoRoutes(logica, acceso));

  return router;
}
