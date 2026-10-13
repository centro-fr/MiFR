import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaPromociones } from "../interface/i-logica-servicio-entrenamiento.js";
import { createPromocionController } from "./promocion.controller.js";
import {
  actualizarPromocionSchema,
  crearPromocionSchema,
  listarPromocionesQuerySchema,
  promocionIdParamSchema,
} from "./promocion.schemas.js";

// Los mismos permisos que los planes: ver con PLANES_VER, y cambiar solo la propietaria con PLANES_EDITAR.
export function createPromocionRoutes(logica: ILogicaPromociones, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createPromocionController(logica);
  const puedeVer = acceso.permiso("PLANES_VER");
  const puedeEditar = [acceso.rol("PROPIETARIA"), acceso.permiso("PLANES_EDITAR")];

  router.use(acceso.sesion);

  router.get("/", puedeVer, validate({ query: listarPromocionesQuerySchema }), controller.listar);
  router.post("/", ...puedeEditar, validate({ body: crearPromocionSchema }), controller.crear);
  router.get("/:id", puedeVer, validate({ params: promocionIdParamSchema }), controller.obtener);
  router.patch(
    "/:id",
    ...puedeEditar,
    validate({ params: promocionIdParamSchema, body: actualizarPromocionSchema }),
    controller.actualizar,
  );
  router.post(
    "/:id/desactivar",
    ...puedeEditar,
    validate({ params: promocionIdParamSchema }),
    controller.desactivar,
  );

  return router;
}
