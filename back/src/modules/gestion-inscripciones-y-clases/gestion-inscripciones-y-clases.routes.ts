import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import { createInscripcionAlumnoRoutes, createInscripcionRoutes } from "./inscripcion/inscripcion.routes.js";
import type { ILogicaInscripcionesYClases } from "./interface/i-logica-inscripciones-y-clases.js";
import { createClaseRoutes } from "./clase/clase.routes.js";
import { createSuplenciaRoutes } from "./suplencia/suplencia.routes.js";

// La baja y la reactivación cuelgan de /alumnos aunque las resuelve Inscripcion. Por eso app.ts
// monta este subsistema después de GestionPersonas, dueño del resto de /alumnos.
export function createGestionInscripcionesYClasesRoutes(
  logica: ILogicaInscripcionesYClases,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();

  router.use("/inscripciones", createInscripcionRoutes(logica, acceso));
  router.use("/alumnos", createInscripcionAlumnoRoutes(logica, acceso));
  router.use("/clases", createClaseRoutes(logica, acceso));
  router.use("/suplencias", createSuplenciaRoutes(logica, acceso));

  return router;
}
