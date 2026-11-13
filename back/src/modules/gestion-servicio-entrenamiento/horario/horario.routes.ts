import { Router } from "express";
import type { ILogicaHorarios } from "../interface/i-logica-servicio-entrenamiento.js";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createHorarioController } from "./horario.controller.js";
import {
  actualizarHorarioSchema,
  crearHorarioSchema,
  horarioIdParamSchema,
  listarHorarioQuerySchema,
} from "./horario.schemas.js";

export function createHorarioRoutes(logica: ILogicaHorarios, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createHorarioController(logica);

  router.use(acceso.sesion);
  router.get(
    "/",
    acceso.permiso("HORARIOS_VER"),
    validate({ query: listarHorarioQuerySchema }),
    controller.listar,
  );
  router.post(
    "/",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ body: crearHorarioSchema }),
    controller.crear,
  );
  router.get(
    "/:id",
    acceso.permiso("HORARIOS_VER"),
    validate({ params: horarioIdParamSchema }),
    controller.obtener,
  );
  router.patch(
    "/:id",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ params: horarioIdParamSchema, body: actualizarHorarioSchema }),
    controller.actualizar,
  );
  router.delete(
    "/:id",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ params: horarioIdParamSchema }),
    controller.darDeBaja,
  );
  router.delete(
    "/:id/baja-programada",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ params: horarioIdParamSchema }),
    controller.cancelarBajaProgramada,
  );

  return router;
}
