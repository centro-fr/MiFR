import cors from "cors";
import express, { type Express } from "express";
import { createSesionRoutes } from "./modules/gestion-usuarios/sesion/sesion.routes.js";
import type { IAutenticacion } from "./modules/gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaUsuarios } from "./modules/gestion-usuarios/usuario/interface/i-logica-usuarios.js";
import { createUserRoutes } from "./modules/gestion-usuarios/usuario/user.routes.js";
import { errorHandler, notFoundHandler } from "./shared/middlewares/error-handler.js";
import { requestLogger } from "./shared/middlewares/logger.js";

export interface AppDependencies {
  usuarioService: ILogicaUsuarios;
  autenticacion: IAutenticacion;
}

export function createApp(deps: AppDependencies): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.get("/health", (_req, res) => res.status(200).json({ status: "ok" }));
  app.use("/api/auth", createSesionRoutes(deps.autenticacion));
  app.use("/api/usuarios", createUserRoutes(deps.usuarioService, deps.autenticacion));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
