import { Router, type NextFunction, type Request, type Response } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createUsuarioController } from "./usuario.controller.js";
import type { ILogicaCuentasDeUsuario } from "../interface/i-logica-usuarios.js";
import {
  actualizarUsuarioSchema,
  asignarRolSchema,
  crearUsuarioSchema,
  rolParamSchema,
  usuarioIdParamSchema,
} from "./usuario.schemas.js";

// El DNI y la fecha de nacimiento identifican a la persona (con el DNI se reusa un tutor existente),
// así que ni el propio usuario los cambia sin permiso. El estado da de baja o reactiva la cuenta:
// eso queda para la propietaria, como los roles, para que un permiso delegado no pueda dejarla afuera.
function requiereAutorizacionParaCamposProtegidos(acceso: ControlDeAcceso) {
  const verificarPermiso = acceso.permiso("USUARIOS_EDITAR");
  const verificarPropietaria = acceso.rol("PROPIETARIA");

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { estado, dni, fecha_nacimiento } = req.body;
    if (estado === undefined && dni === undefined && fecha_nacimiento === undefined) return next();
    if (estado !== undefined) await verificarPropietaria(req, res, () => {});
    await verificarPermiso(req, res, next);
  };
}

export function createUsuarioRoutes(
  gestionUsuarios: ILogicaCuentasDeUsuario,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createUsuarioController(gestionUsuarios);
  // Asignar o quitar roles y borrar cuentas es administración de la seguridad, igual que la matriz:
  // además del permiso, que la propietaria puede delegar, exige ser propietaria.
  const soloPropietaria = acceso.rol("PROPIETARIA");

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
    requiereAutorizacionParaCamposProtegidos(acceso),
    controller.actualizar,
  );
  router.delete(
    "/:id",
    soloPropietaria,
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema }),
    controller.eliminar,
  );

  router.post(
    "/:id/roles",
    soloPropietaria,
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: usuarioIdParamSchema, body: asignarRolSchema }),
    controller.asignarRol,
  );
  router.delete(
    "/:id/roles/:rol",
    soloPropietaria,
    acceso.permiso("USUARIOS_EDITAR"),
    validate({ params: rolParamSchema }),
    controller.quitarRol,
  );

  return router;
}
