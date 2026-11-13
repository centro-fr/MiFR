import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import { createInsigniaRoutes } from "./insignia/insignia.routes.js";
import type { ILogicaInsignias } from "./interface/i-logica-insignias.js";

export function createGestionInsigniasRoutes(logica: ILogicaInsignias, acceso: ControlDeAcceso): Router {
  const router = Router();

  router.use(createInsigniaRoutes(logica, acceso));

  return router;
}
