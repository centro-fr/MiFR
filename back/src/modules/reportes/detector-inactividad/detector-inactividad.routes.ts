import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaAlumnosInactivos } from "../interface/i-logica-informes.js";
import { createDetectorInactividadController } from "./detector-inactividad.controller.js";
import {
  listarAlumnosInactivosQuerySchema,
  registrarSeguimientoSchema,
  seguimientoParamSchema,
} from "./detector-inactividad.schemas.js";

// US-22: visible solo para la propietaria. REPORTES_COBRANZA_VER ya es exclusivo de ella (decisión de
// SPRINT-4.md); el rol se exige igual, porque el listado trae datos de contacto de todos los alumnos.
export function createDetectorInactividadRoutes(
  logica: ILogicaAlumnosInactivos,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createDetectorInactividadController(logica);

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"), acceso.permiso("REPORTES_COBRANZA_VER"));
  router.get("/", validate({ query: listarAlumnosInactivosQuerySchema }), controller.listar);
  router.put(
    "/:idInscripcion/seguimiento",
    validate({ params: seguimientoParamSchema, body: registrarSeguimientoSchema }),
    controller.registrarSeguimiento,
  );
  router.delete(
    "/:idInscripcion/seguimiento",
    validate({ params: seguimientoParamSchema }),
    controller.quitarSeguimiento,
  );

  return router;
}
