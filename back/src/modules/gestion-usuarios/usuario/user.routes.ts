import { Router } from "express";
import { requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import type { IAutenticacion } from "../sesion/interface/i-autenticacion.js";
import { createUserController } from "./user.controller.js";
import type { ILogicaUsuarios } from "./interface/i-logica-usuarios.js";
import {
  actualizarUsuarioSchema,
  asignarRolSchema,
  crearUsuarioSchema,
  rolParamSchema,
  usuarioIdParamSchema,
} from "./user.schemas.js";

export function createUserRoutes(usuarioService: ILogicaUsuarios, autenticacion: IAutenticacion): Router {
  const router = Router();
  const controller = createUserController(usuarioService);

  router.use(requiereSesion(autenticacion));

  router.post(
    "/",
    requiereRol("PROPIETARIA"),
    validate({ body: crearUsuarioSchema }),
    asyncHandler(controller.crear),
  );
  router.get("/", requiereRol("PROPIETARIA"), asyncHandler(controller.listar));
  router.get("/:id", validate({ params: usuarioIdParamSchema }), asyncHandler(controller.obtenerPorId));
  router.patch(
    "/:id",
    validate({ params: usuarioIdParamSchema, body: actualizarUsuarioSchema }),
    asyncHandler(controller.actualizar),
  );
  router.delete(
    "/:id",
    requiereRol("PROPIETARIA"),
    validate({ params: usuarioIdParamSchema }),
    asyncHandler(controller.eliminar),
  );

  router.post(
    "/:id/roles",
    requiereRol("PROPIETARIA"),
    validate({ params: usuarioIdParamSchema, body: asignarRolSchema }),
    asyncHandler(controller.asignarRol),
  );
  router.delete(
    "/:id/roles/:rol",
    requiereRol("PROPIETARIA"),
    validate({ params: rolParamSchema }),
    asyncHandler(controller.quitarRol),
  );

  return router;
}
