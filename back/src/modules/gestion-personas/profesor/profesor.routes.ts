import { Router } from "express";
import type { ILogicaPersonas } from "../interface/i-logica-personas.js";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createProfesorController } from "./profesor.controller.js";
import { crearProfesoraSchema, profesoraIdParamSchema } from "./profesor.schemas.js";

export function createProfesorRoutes(logica: ILogicaPersonas, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createProfesorController(logica);

  router.use(acceso.sesion);
  router.get("/", acceso.permiso("HORARIOS_VER"), controller.listar);
  router.post(
    "/",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ body: crearProfesoraSchema }),
    controller.crear,
  );
  router.delete(
    "/:id",
    acceso.rol("PROPIETARIA"),
    acceso.permiso("HORARIOS_EDITAR"),
    validate({ params: profesoraIdParamSchema }),
    controller.darDeBaja,
  );

  return router;
}
