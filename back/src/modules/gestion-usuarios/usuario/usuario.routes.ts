import { Router, type NextFunction, type Request, type Response } from "express";
import { requierePermiso, requierePropioOPermiso, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../sesion/interface/i-autenticacion.js";
import { createUsuarioController } from "./usuario.controller.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import {
  actualizarUsuarioSchema,
  asignarRolSchema,
  crearUsuarioSchema,
  rolParamSchema,
  usuarioIdParamSchema,
} from "./usuario.schemas.js";

// El estado da de baja o reactiva la cuenta: ni el propio usuario lo cambia sin permiso.
function requierePermisoParaCambiarEstado(autorizacion: IAutorizacion) {
  const verificarPermiso = requierePermiso(autorizacion, "USUARIOS_EDITAR");

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.body.estado === undefined) return next();
    verificarPermiso(req, res, next);
  };
}

export function createUsuarioRoutes(
  gestionUsuarios: ILogicaUsuarios,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createUsuarioController(gestionUsuarios);

  router.use(requiereSesion(autenticacion));

  router.post(
    "/",
    requierePermiso(autorizacion, "USUARIOS_EDITAR"),
    validate({ body: crearUsuarioSchema }),
    asyncHandler(controller.crear),
  );
  router.get("/", requierePermiso(autorizacion, "USUARIOS_VER"), asyncHandler(controller.listar));
  router.get(
    "/:id",
    validate({ params: usuarioIdParamSchema }),
    requierePropioOPermiso(autorizacion, "USUARIOS_VER"),
    asyncHandler(controller.obtenerPorId),
  );
  router.patch(
    "/:id",
    validate({ params: usuarioIdParamSchema, body: actualizarUsuarioSchema }),
    requierePropioOPermiso(autorizacion, "USUARIOS_EDITAR"),
    requierePermisoParaCambiarEstado(autorizacion),
    asyncHandler(controller.actualizar),
  );
  router.delete(
    "/:id",
    requierePermiso(autorizacion, "USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema }),
    asyncHandler(controller.eliminar),
  );

  router.post(
    "/:id/roles",
    requierePermiso(autorizacion, "USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema, body: asignarRolSchema }),
    asyncHandler(controller.asignarRol),
  );
  router.delete(
    "/:id/roles/:rol",
    requierePermiso(autorizacion, "USUARIOS_EDITAR"),
    validate({ params: rolParamSchema }),
    asyncHandler(controller.quitarRol),
  );

  return router;
}
