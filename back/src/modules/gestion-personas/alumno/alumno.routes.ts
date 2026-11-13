import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaAlumnos } from "../interface/i-logica-personas.js";
import { createAlumnoController } from "./alumno.controller.js";
import {
  actualizarAlumnoSchema,
  alumnoIdParamSchema,
  crearAlumnoSchema,
  historialAsistenciaQuerySchema,
  listarAlumnoQuerySchema,
  panelAlumnoQuerySchema,
} from "./alumno.schemas.js";

export function createAlumnoRoutes(logica: ILogicaAlumnos, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createAlumnoController(logica);
  router.use(acceso.sesion);

  // Alumno y tutor no tienen permisos de alumnos: lo suyo se resuelve por pertenencia, en el service.
  router.get("/mios", acceso.rol("ALUMNO", "TUTOR"), controller.listarMios);
  // Antes de /:id, que tomaría "mi-panel" como un id.
  router.get(
    "/mi-panel",
    acceso.rol("ALUMNO", "TUTOR"),
    validate({ query: panelAlumnoQuerySchema }),
    controller.panel,
  );
  router.get(
    "/",
    acceso.permiso("ALUMNOS_VER"),
    validate({ query: listarAlumnoQuerySchema }),
    controller.listar,
  );
  router.post("/", acceso.permiso("ALUMNOS_EDITAR"), validate({ body: crearAlumnoSchema }), controller.crear);
  router.get(
    "/:id",
    acceso.permiso("ALUMNOS_VER"),
    validate({ params: alumnoIdParamSchema }),
    controller.obtener,
  );
  router.get(
    "/:id/asistencias",
    acceso.permiso("ALUMNOS_VER"),
    validate({ params: alumnoIdParamSchema, query: historialAsistenciaQuerySchema }),
    controller.asistencias,
  );
  router.patch(
    "/:id",
    acceso.permiso("ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: actualizarAlumnoSchema }),
    controller.actualizar,
  );

  return router;
}
