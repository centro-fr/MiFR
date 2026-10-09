import { Router } from "express";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import type { IAutenticacion } from "../sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "./interface/i-autorizacion.js";
import { createRolController } from "./rol.controller.js";
import { actualizarMatrizSchema } from "./rol.schemas.js";

// La matriz es solo de la propietaria (US-02): se exige el rol además del permiso,
// para que ni un error de carga en rol_permisos le abra la pantalla a otro rol.
export function createRolRoutes(
  gestionUsuarios: ILogicaUsuarios,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createRolController(gestionUsuarios);

  router.use(requiereSesion(autenticacion), requiereRol("PROPIETARIA"));

  router.get("/matriz", requierePermiso(autorizacion, "SEGURIDAD_MATRIZ_VER"), controller.obtenerMatriz);
  router.put(
    "/matriz",
    requierePermiso(autorizacion, "SEGURIDAD_MATRIZ_EDITAR"),
    validate({ body: actualizarMatrizSchema }),
    controller.actualizarMatriz,
  );

  return router;
}
