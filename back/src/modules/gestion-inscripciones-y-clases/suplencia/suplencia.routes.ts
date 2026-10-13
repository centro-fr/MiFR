import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaSuplencias } from "../interface/i-logica-inscripciones-y-clases.js";
import { createSuplenciaController } from "./suplencia.controller.js";
import {
  cambiarSuplenciaSchema,
  listarSuplenciasQuerySchema,
  registrarSuplenciaSchema,
  suplenciaParamSchema,
} from "./suplencia.schemas.js";

// Solo la propietaria (US-24): las suplencias deciden a quién se le pagan las clases.
export function createSuplenciaRoutes(logica: ILogicaSuplencias, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createSuplenciaController(logica);
  const liquidar = acceso.permiso("HONORARIOS_LIQUIDAR");

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"));
  router.get(
    "/",
    acceso.permiso("HONORARIOS_VER_TODOS"),
    validate({ query: listarSuplenciasQuerySchema }),
    controller.listar,
  );
  router.post("/", liquidar, validate({ body: registrarSuplenciaSchema }), controller.registrar);
  router.patch(
    "/:idClase",
    liquidar,
    validate({ params: suplenciaParamSchema, body: cambiarSuplenciaSchema }),
    controller.cambiar,
  );
  router.delete("/:idClase", liquidar, validate({ params: suplenciaParamSchema }), controller.eliminar);

  return router;
}
