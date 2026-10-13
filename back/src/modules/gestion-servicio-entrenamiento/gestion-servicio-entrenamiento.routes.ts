import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import { createActividadRoutes } from "./actividad/actividad.routes.js";
import { createHorarioRoutes } from "./horario/horario.routes.js";
import type { ILogicaServicioEntrenamiento } from "./interface/i-logica-servicio-entrenamiento.js";
import { createParametrosSistemaRoutes } from "./parametros-sistema/parametros-sistema.routes.js";
import { createPlanRoutes } from "./plan/plan.routes.js";
import { createPromocionRoutes } from "./promocion/promocion.routes.js";

export function createGestionServicioEntrenamientoRoutes(
  logica: ILogicaServicioEntrenamiento,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();

  router.use("/actividades", createActividadRoutes(logica, acceso));
  router.use("/horarios", createHorarioRoutes(logica, acceso));
  router.use("/planes", createPlanRoutes(logica, acceso));
  router.use("/promociones", createPromocionRoutes(logica, acceso));
  router.use("/parametros", createParametrosSistemaRoutes(logica, acceso));

  return router;
}
