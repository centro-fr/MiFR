import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createActividadController } from "./actividad.controller.js";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import {
  actividadIdParamSchema,
  actualizarActividadSchema,
  crearActividadSchema,
  listarActividadQuerySchema,
} from "./actividad.schemas.js";

export function createActividadRoutes(logica: ILogicaServicioEntrenamiento, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createActividadController(logica);

  router.use(acceso.sesion);

  router.get(
    "/",
    acceso.permiso("ACTIVIDADES_VER"),
    validate({ query: listarActividadQuerySchema }),
    controller.listar,
  );

  router.post(
    "/",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("ACTIVIDADES_EDITAR"),
    validate({ body: crearActividadSchema }),
    controller.crear,
  );

  router.get(
    "/:id",
    acceso.permiso("ACTIVIDADES_VER"),
    validate({ params: actividadIdParamSchema }),
    controller.obtener,
  );

  router.patch(
    "/:id",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("ACTIVIDADES_EDITAR"),
    validate({ params: actividadIdParamSchema, body: actualizarActividadSchema }),
    controller.actualizar,
  );

  router.delete(
    "/:id",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("ACTIVIDADES_EDITAR"),
    validate({ params: actividadIdParamSchema }),
    controller.baja,
  );

  return router;
}
