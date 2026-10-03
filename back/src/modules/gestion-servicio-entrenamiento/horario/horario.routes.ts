import { Router } from "express";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createHorarioController } from "./horario.controller.js";
import {
  actualizarHorarioSchema,
  crearHorarioSchema,
  horarioIdParamSchema,
  listarHorarioQuerySchema,
} from "./horario.schemas.js";

export function createHorarioRoutes(
  logica: ILogicaServicioEntrenamiento,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createHorarioController(logica);

  router.use(requiereSesion(autenticacion));
  router.get(
    "/",
    requierePermiso(autorizacion, "HORARIOS_VER"),
    validate({ query: listarHorarioQuerySchema }),
    asyncHandler(controller.listar),
  );
  router.post(
    "/",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "HORARIOS_EDITAR"),
    validate({ body: crearHorarioSchema }),
    asyncHandler(controller.crear),
  );
  router.get(
    "/:id",
    requierePermiso(autorizacion, "HORARIOS_VER"),
    validate({ params: horarioIdParamSchema }),
    asyncHandler(controller.obtener),
  );
  router.patch(
    "/:id",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "HORARIOS_EDITAR"),
    validate({ params: horarioIdParamSchema, body: actualizarHorarioSchema }),
    asyncHandler(controller.actualizar),
  );
  router.delete(
    "/:id",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "HORARIOS_EDITAR"),
    validate({ params: horarioIdParamSchema }),
    asyncHandler(controller.darDeBaja),
  );

  return router;
}
