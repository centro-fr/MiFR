import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaTarifasHonorario } from "../interface/i-logica-honorarios.js";
import { createTarifaHonorarioController } from "./tarifa-honorario.controller.js";
import {
  cerrarTarifaSchema,
  listarTarifasQuerySchema,
  registrarTarifaSchema,
  tarifaIdParamSchema,
} from "./tarifa-honorario.schemas.js";

// Solo la propietaria (US-23): las tarifas deciden cuánto cobra cada profesora. Ver pide
// HONORARIOS_VER_TODOS; registrar y cerrar, HONORARIOS_LIQUIDAR, como las suplencias.
export function createTarifaHonorarioRoutes(
  logica: ILogicaTarifasHonorario,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createTarifaHonorarioController(logica);
  const liquidar = acceso.permiso("HONORARIOS_LIQUIDAR");

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"));
  router.get(
    "/",
    acceso.permiso("HONORARIOS_VER_TODOS"),
    validate({ query: listarTarifasQuerySchema }),
    controller.listar,
  );
  router.post("/", liquidar, validate({ body: registrarTarifaSchema }), controller.registrar);
  router.post(
    "/:id/cerrar",
    liquidar,
    validate({ params: tarifaIdParamSchema, body: cerrarTarifaSchema }),
    controller.cerrar,
  );

  return router;
}
