import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import { createRolController } from "./rol.controller.js";
import { actualizarMatrizSchema } from "./rol.schemas.js";

// La matriz es solo de la propietaria (US-02): se exige el rol además del permiso,
// para que ni un error de carga en rol_permisos le abra la pantalla a otro rol.
export function createRolRoutes(gestionUsuarios: ILogicaUsuarios, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createRolController(gestionUsuarios);

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"));

  router.get("/matriz", acceso.permiso("SEGURIDAD_MATRIZ_VER"), controller.obtenerMatriz);
  router.put(
    "/matriz",
    acceso.permiso("SEGURIDAD_MATRIZ_EDITAR"),
    validate({ body: actualizarMatrizSchema }),
    controller.actualizarMatriz,
  );

  return router;
}
