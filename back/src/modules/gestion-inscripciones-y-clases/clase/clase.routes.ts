import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaClasesYAsistencia } from "../interface/i-logica-inscripciones-y-clases.js";
import { claseIdParamSchema } from "./clase.schemas.js";
import { createClaseController } from "./clase.controller.js";
import { claseYAlumnoParamSchema, marcarAsistenciaSchema } from "../asistencia/asistencia.schemas.js";

export function createClaseRoutes(logica: ILogicaClasesYAsistencia, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createClaseController(logica);

  router.use(acceso.sesion, acceso.permiso("ASISTENCIAS_MARCAR"));
  router.get("/hoy", controller.listarDelDia);
  router.get("/:id/asistencia", validate({ params: claseIdParamSchema }), controller.obtenerAsistencia);
  router.put(
    "/:id/asistencia/:idAlumno",
    validate({ params: claseYAlumnoParamSchema, body: marcarAsistenciaSchema }),
    controller.marcar,
  );
  router.post(
    "/:id/asistencia/todos-presentes",
    validate({ params: claseIdParamSchema }),
    controller.marcarTodosPresentes,
  );
  router.post("/:id/cerrar", validate({ params: claseIdParamSchema }), controller.cerrar);

  return router;
}
