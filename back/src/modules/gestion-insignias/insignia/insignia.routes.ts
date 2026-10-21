import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaInsigniasDeAlumnos } from "../interface/i-logica-insignias.js";
import { createInsigniaController } from "./insignia.controller.js";
import { alumnoInsigniasParamsSchema, rankingAsistenciaQuerySchema } from "./insignia.schemas.js";

// El permiso abre la pantalla; qué alumno puede ver cada uno lo decide Insignia con el solicitante.
export function createInsigniaRoutes(logica: ILogicaInsigniasDeAlumnos, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createInsigniaController(logica);

  router.get(
    "/alumnos/:id/insignias",
    acceso.sesion,
    acceso.permiso("INSIGNIAS_VER_PROPIAS"),
    validate({ params: alumnoInsigniasParamsSchema }),
    controller.ficha,
  );
  router.get(
    "/reportes/ranking-asistencia",
    acceso.sesion,
    acceso.permiso("REPORTES_RANKING_VER"),
    validate({ query: rankingAsistenciaQuerySchema }),
    controller.ranking,
  );

  return router;
}
