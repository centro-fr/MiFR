import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import { createDetectorInactividadRoutes } from "./detector-inactividad/detector-inactividad.routes.js";
import { createGeneradorInformesRoutes } from "./generador-informes/generador-informes.routes.js";
import type { ILogicaInformes } from "./interface/i-logica-informes.js";

export function createReportesRoutes(logica: ILogicaInformes, acceso: ControlDeAcceso): Router {
  const router = Router();

  router.use("/informes/alumnos-inactivos", createDetectorInactividadRoutes(logica, acceso));
  router.use("/reportes", createGeneradorInformesRoutes(logica, acceso));

  return router;
}
