import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import type { ILogicaUsuarios } from "./interface/i-logica-usuarios.js";
import { createRolRoutes } from "./rol/rol.routes.js";
import { createSesionRoutes } from "./sesion/sesion.routes.js";
import { createUsuarioRoutes } from "./usuario/usuario.routes.js";

export interface OpcionesGestionUsuarios {
  loginDesarrollo?: boolean;
}

export function createGestionUsuariosRoutes(
  logica: ILogicaUsuarios,
  acceso: ControlDeAcceso,
  opciones: OpcionesGestionUsuarios = {},
): Router {
  const router = Router();

  router.use("/auth", createSesionRoutes(logica, acceso, opciones));
  router.use("/usuarios", createUsuarioRoutes(logica, acceso));
  router.use("/seguridad", createRolRoutes(logica, acceso));

  return router;
}
