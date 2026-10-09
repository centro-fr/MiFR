import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import { createAlumnoRoutes } from "./alumno/alumno.routes.js";
import type { ILogicaPersonas } from "./interface/i-logica-personas.js";
import { createProfesorRoutes } from "./profesor/profesor.routes.js";

export function createGestionPersonasRoutes(logica: ILogicaPersonas, acceso: ControlDeAcceso): Router {
  const router = Router();

  router.use("/profesoras", createProfesorRoutes(logica, acceso));
  router.use("/alumnos", createAlumnoRoutes(logica, acceso));

  return router;
}
