import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import type { ILogicaNotificaciones } from "./interface/i-logica-notificaciones.js";
import { createNotificacionRoutes } from "./notificacion/notificacion.routes.js";

export function createGestionNotificacionesRoutes(
  logica: ILogicaNotificaciones,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();

  router.use("/notificaciones", createNotificacionRoutes(logica, acceso));

  return router;
}
