import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaSuscripcionesPush } from "../interface/i-logica-notificaciones.js";
import { createSuscripcionPushController } from "./suscripcion-push.controller.js";
import { bajaSuscripcionPushSchema, suscripcionPushSchema } from "./suscripcion-push.schemas.js";

// Solo piden sesión: cada persona suscribe y da de baja sus propios dispositivos, así que no hay
// permiso que delegar.
export function createSuscripcionPushRoutes(
  logica: ILogicaSuscripcionesPush,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createSuscripcionPushController(logica);

  router.use(acceso.sesion);
  router.get("/clave-publica", controller.clavePublica);
  router.post("/suscripciones", validate({ body: suscripcionPushSchema }), controller.suscribir);
  router.post("/suscripciones/baja", validate({ body: bajaSuscripcionPushSchema }), controller.darDeBaja);

  return router;
}
