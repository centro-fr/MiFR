import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import type { ILogicaHonorarios } from "./interface/i-logica-honorarios.js";
import { createLiquidacionRoutes } from "./liquidacion/liquidacion.routes.js";
import { createTarifaHonorarioRoutes } from "./tarifa-honorario/tarifa-honorario.routes.js";

export function createGestionHonorariosRoutes(logica: ILogicaHonorarios, acceso: ControlDeAcceso): Router {
  const router = Router();

  router.use("/tarifas-honorario", createTarifaHonorarioRoutes(logica, acceso));
  router.use("/liquidaciones", createLiquidacionRoutes(logica, acceso));

  return router;
}
