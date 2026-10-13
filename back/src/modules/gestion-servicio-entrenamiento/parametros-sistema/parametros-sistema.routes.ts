import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaParametros } from "../interface/i-logica-servicio-entrenamiento.js";
import { createParametrosSistemaController } from "./parametros-sistema.controller.js";
import { actualizarParametroSchema, claveParametroParamSchema } from "./parametros-sistema.schemas.js";

export function createParametrosSistemaRoutes(logica: ILogicaParametros, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createParametrosSistemaController(logica);
  const soloPropietaria = [acceso.rol("PROPIETARIA"), acceso.permiso("PARAMETROS_EDITAR")];

  router.use(acceso.sesion);

  router.get("/", ...soloPropietaria, controller.listar);
  // US-16: lo que ven el alumno y su tutor para transferir. No necesitan un permiso: es lo mismo para todos.
  router.get("/datos-bancarios", acceso.rol("ALUMNO", "TUTOR", "PROPIETARIA"), controller.datosBancarios);
  router.patch(
    "/:clave",
    ...soloPropietaria,
    validate({ params: claveParametroParamSchema, body: actualizarParametroSchema }),
    controller.actualizar,
  );

  return router;
}
