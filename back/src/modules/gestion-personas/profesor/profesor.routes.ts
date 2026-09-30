import { Router } from "express";
import type { ILogicaPersonas } from "../interface/i-logica-personas.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { createProfesorController } from "./profesor.controller.js";
import { crearProfesoraSchema, profesoraIdParamSchema } from "./profesor.schemas.js";

export function createProfesorRoutes(
  logica: ILogicaPersonas,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createProfesorController(logica);

  router.use(requiereSesion(autenticacion));
  router.get("/", requierePermiso(autorizacion, "HORARIOS_VER"), asyncHandler(controller.listar));
  router.post(
    "/",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "HORARIOS_EDITAR"),
    validate({ body: crearProfesoraSchema }),
    asyncHandler(controller.crear),
  );
  router.delete(
    "/:id",
    requiereRol("PROPIETARIA"),
    requierePermiso(autorizacion, "HORARIOS_EDITAR"),
    validate({ params: profesoraIdParamSchema }),
    asyncHandler(controller.darDeBaja),
  );

  return router;
}
