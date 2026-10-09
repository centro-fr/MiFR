import { Router } from "express";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import { createActividadController } from "./actividad.controller.js";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import {
  actividadIdParamSchema,
  actualizarActividadSchema,
  crearActividadSchema,
  listarActividadQuerySchema,
} from "./actividad.schemas.js";

export function createActividadRoutes(
  logica: ILogicaServicioEntrenamiento,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createActividadController(logica);

  router.use(requiereSesion(autenticacion));

  router.get(
    "/",
    requierePermiso(autorizacion, "ACTIVIDADES_VER"),
    validate({ query: listarActividadQuerySchema }),
    controller.listar,
  );

  router.post(
    "/",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "ACTIVIDADES_EDITAR"),
    validate({ body: crearActividadSchema }),
    controller.crear,
  );

  router.get(
    "/:id",
    requierePermiso(autorizacion, "ACTIVIDADES_VER"),
    validate({ params: actividadIdParamSchema }),
    controller.obtener,
  );

  router.patch(
    "/:id",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "ACTIVIDADES_EDITAR"),
    validate({ params: actividadIdParamSchema, body: actualizarActividadSchema }),
    controller.actualizar,
  );

  router.delete(
    "/:id",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "ACTIVIDADES_EDITAR"),
    validate({ params: actividadIdParamSchema }),
    controller.baja,
  );

  return router;
}
