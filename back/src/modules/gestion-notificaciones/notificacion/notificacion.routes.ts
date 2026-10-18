import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaNotificacionesPropias } from "../interface/i-logica-notificaciones.js";
import { createNotificacionController } from "./notificacion.controller.js";
import { listarNotificacionesQuerySchema, notificacionParamSchema } from "./notificacion.schemas.js";

// Solo piden sesión: cada persona ve y marca únicamente las suyas, y el service filtra por quien pide.
// Por eso no hay permiso que delegar.
export function createNotificacionRoutes(
  logica: ILogicaNotificacionesPropias,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createNotificacionController(logica);

  router.use(acceso.sesion);
  router.get("/mias", validate({ query: listarNotificacionesQuerySchema }), controller.listarMias);
  router.post("/leidas", controller.marcarTodasLeidas);
  router.post("/:id/leida", validate({ params: notificacionParamSchema }), controller.marcarLeida);

  return router;
}
