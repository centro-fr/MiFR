import cors from "cors";
import express, { Router, type Express } from "express";
import helmet from "helmet";
import type { IAutorizacion } from "./modules/gestion-usuarios/rol/interface/i-autorizacion.js";
import { createRolRoutes } from "./modules/gestion-usuarios/rol/rol.routes.js";
import { createSesionRoutes } from "./modules/gestion-usuarios/sesion/sesion.routes.js";
import type { IAutenticacion } from "./modules/gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "./modules/gestion-usuarios/interface/i-logica-usuarios.js";
import { createUsuarioRoutes } from "./modules/gestion-usuarios/usuario/usuario.routes.js";
import { createActividadRoutes } from "./modules/gestion-servicio-entrenamiento/actividad/actividad.routes.js";
import type { ILogicaServicioEntrenamiento } from "./modules/gestion-servicio-entrenamiento/interface/i-logica-servicio-entrenamiento.js";
import { createProfesorRoutes } from "./modules/gestion-personas/profesor/profesor.routes.js";
import { createAlumnoRoutes } from "./modules/gestion-personas/alumno/alumno.routes.js";
import type { ILogicaPersonas } from "./modules/gestion-personas/interface/i-logica-personas.js";
import { createHorarioRoutes } from "./modules/gestion-servicio-entrenamiento/horario/horario.routes.js";
import { createPlanRoutes } from "./modules/gestion-servicio-entrenamiento/plan/plan.routes.js";
import type { ILogicaInscripcionesYClases } from "./modules/gestion-inscripciones-y-clases/interface/i-logica-inscripciones-y-clases.js";
import {
  createInscripcionAlumnoRoutes,
  createInscripcionRoutes,
} from "./modules/gestion-inscripciones-y-clases/inscripcion/inscripcion.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middlewares/error-handler.js";
import { createDocumentacionRoutes } from "./shared/openapi/documentacion.routes.js";
import type { DocumentoOpenApi } from "./shared/openapi/registro.js";
import { requestLogger } from "./shared/middlewares/logger.js";

export interface AppDependencies {
  gestionUsuarios: ILogicaUsuarios;
  gestionPersonas: ILogicaPersonas;
  gestionServicioEntrenamiento: ILogicaServicioEntrenamiento;
  gestionInscripcionesYClases: ILogicaInscripcionesYClases;
  autenticacion: IAutenticacion;
  autorizacion: IAutorizacion;
}

export interface AppOpciones {
  // Sin documento no se publica Swagger: index.ts decide no exponerlo en producción.
  documentacionApi?: DocumentoOpenApi;
  // Sin lista se acepta cualquier origen, que solo sirve en desarrollo.
  origenesPermitidos?: string[];
  // Habilita POST /auth/desarrollo (login sin Google). index.ts lo impide en producción.
  loginDesarrollo?: boolean;
}

export function createApp(deps: AppDependencies, opciones: AppOpciones = {}): Express {
  const app = express();

  // Cabeceras de seguridad (nosniff, X-Frame-Options, CSP, HSTS) y sin X-Powered-By.
  app.use(helmet());
  app.use(cors(opciones.origenesPermitidos ? { origin: opciones.origenesPermitidos } : undefined));
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));

  // Prefijo versionado del SDD: un cambio incompatible de contrato se publica como /api/v2.
  const api = Router();
  if (opciones.documentacionApi) {
    api.use("/docs", createDocumentacionRoutes(opciones.documentacionApi));
  }
  api.use(
    "/auth",
    createSesionRoutes(deps.gestionUsuarios, deps.autenticacion, {
      loginDesarrollo: opciones.loginDesarrollo,
    }),
  );
  api.use("/usuarios", createUsuarioRoutes(deps.gestionUsuarios, deps.autenticacion, deps.autorizacion));
  api.use("/seguridad", createRolRoutes(deps.gestionUsuarios, deps.autenticacion, deps.autorizacion));
  api.use(
    "/actividades",
    createActividadRoutes(deps.gestionServicioEntrenamiento, deps.autenticacion, deps.autorizacion),
  );
  api.use("/profesoras", createProfesorRoutes(deps.gestionPersonas, deps.autenticacion, deps.autorizacion));
  api.use("/alumnos", createAlumnoRoutes(deps.gestionPersonas, deps.autenticacion, deps.autorizacion));
  api.use(
    "/horarios",
    createHorarioRoutes(deps.gestionServicioEntrenamiento, deps.autenticacion, deps.autorizacion),
  );
  api.use(
    "/planes",
    createPlanRoutes(deps.gestionServicioEntrenamiento, deps.autenticacion, deps.autorizacion),
  );
  api.use(
    "/inscripciones",
    createInscripcionRoutes(deps.gestionInscripcionesYClases, deps.autenticacion, deps.autorizacion),
  );
  api.use(
    "/alumnos",
    createInscripcionAlumnoRoutes(deps.gestionInscripcionesYClases, deps.autenticacion, deps.autorizacion),
  );
  app.use("/api/v1", api);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
