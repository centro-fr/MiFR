import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaLiquidaciones } from "../interface/i-logica-honorarios.js";
import { createLiquidacionController } from "./liquidacion.controller.js";
import {
  generarLiquidacionesSchema,
  liquidacionIdParamSchema,
  listarLiquidacionesQuerySchema,
} from "./liquidacion.schemas.js";

// Solo la propietaria (US-23): la profesora no accede al informe consolidado.
export function createLiquidacionRoutes(logica: ILogicaLiquidaciones, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createLiquidacionController(logica);
  const ver = acceso.permiso("HONORARIOS_VER_TODOS");
  const liquidar = acceso.permiso("HONORARIOS_LIQUIDAR");

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"));
  router.get("/", ver, validate({ query: listarLiquidacionesQuerySchema }), controller.listar);
  router.get("/:id", ver, validate({ params: liquidacionIdParamSchema }), controller.obtener);
  router.post("/", liquidar, validate({ body: generarLiquidacionesSchema }), controller.generar);
  router.post("/:id/cerrar", liquidar, validate({ params: liquidacionIdParamSchema }), controller.cerrar);
  router.post("/:id/pagar", liquidar, validate({ params: liquidacionIdParamSchema }), controller.pagar);

  return router;
}