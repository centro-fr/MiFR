import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createSesionController } from "./sesion.controller.js";
import { googleLoginSchema, loginDesarrolloSchema } from "./sesion.schemas.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";

export function createSesionRoutes(
  gestionUsuarios: ILogicaUsuarios,
  acceso: ControlDeAcceso,
  { loginDesarrollo = false }: { loginDesarrollo?: boolean } = {},
): Router {
  const router = Router();
  const controller = createSesionController(gestionUsuarios);

  router.post("/google", validate({ body: googleLoginSchema }), controller.googleLogin);
  // Sin la opción la ruta no existe (404): no depende de un chequeo dentro del handler.
  if (loginDesarrollo) {
    router.post("/desarrollo", validate({ body: loginDesarrolloSchema }), controller.loginDesarrollo);
  }
  router.get("/me", acceso.sesion, controller.me);
  router.post("/logout", acceso.sesion, controller.logout);

  return router;
}
