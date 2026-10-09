import { Router } from "express";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import { createPlanController } from "./plan.controller.js";
import {
  actualizarPlanSchema,
  crearPlanSchema,
  listarPlanQuerySchema,
  planIdParamSchema,
  registrarPrecioSchema,
} from "./plan.schemas.js";

export function createPlanRoutes(
  logica: ILogicaServicioEntrenamiento,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createPlanController(logica);
  const puedeVer = requierePermiso(autorizacion, "PLANES_VER");
  const puedeEditar = [requiereRol("PROPIETARIA"), requierePermiso(autorizacion, "PLANES_EDITAR")];

  router.use(requiereSesion(autenticacion));

  router.get("/", puedeVer, validate({ query: listarPlanQuerySchema }), controller.listar);
  router.post("/", ...puedeEditar, validate({ body: crearPlanSchema }), controller.crear);
  router.get("/:id", puedeVer, validate({ params: planIdParamSchema }), controller.obtener);
  router.patch(
    "/:id",
    ...puedeEditar,
    validate({ params: planIdParamSchema, body: actualizarPlanSchema }),
    controller.actualizar,
  );
  router.delete("/:id", ...puedeEditar, validate({ params: planIdParamSchema }), controller.baja);
  router.get("/:id/precios", puedeVer, validate({ params: planIdParamSchema }), controller.listarPrecios);
  router.post(
    "/:id/precios",
    ...puedeEditar,
    validate({ params: planIdParamSchema, body: registrarPrecioSchema }),
    controller.registrarPrecio,
  );

  return router;
}
