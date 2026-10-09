import { Router, type NextFunction, type Request, type Response } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
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
function requierePermisoParaCambiarEstado(acceso: ControlDeAcceso) {
  const verificarPermiso = acceso.permiso("USUARIOS_EDITAR");

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (req.body.estado === undefined) return next();
    await verificarPermiso(req, res, next);
  };
}

export function createUsuarioRoutes(gestionUsuarios: ILogicaUsuarios, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createUsuarioController(gestionUsuarios);

  router.use(acceso.sesion);

  router.post(
    "/",
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ body: crearUsuarioSchema }),
    controller.crear,
  );
  router.get("/", acceso.permiso("USUARIOS_VER"), controller.listar);
  router.get(
    "/:id",
    validate({ params: usuarioIdParamSchema }),
    acceso.propioOPermiso("USUARIOS_VER"),
    controller.obtenerPorId,
  );
  router.patch(
    "/:id",
    validate({ params: usuarioIdParamSchema, body: actualizarUsuarioSchema }),
    acceso.propioOPermiso("USUARIOS_EDITAR"),
    requierePermisoParaCambiarEstado(acceso),
    controller.actualizar,
  );
  router.delete(
    "/:id",
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema }),
    controller.eliminar,
  );

  router.post(
    "/:id/roles",
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema, body: asignarRolSchema }),
    controller.asignarRol,
  );
  router.delete(
    "/:id/roles/:rol",
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: rolParamSchema }),
    controller.quitarRol,
  );

  return router;
}
