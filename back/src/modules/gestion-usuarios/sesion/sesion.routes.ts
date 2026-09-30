import { Router } from "express";
import { requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { createSesionController } from "./sesion.controller.js";
import { googleLoginSchema } from "./sesion.schemas.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import type { IAutenticacion } from "./interface/i-autenticacion.js";

export function createSesionRoutes(gestionUsuarios: ILogicaUsuarios, autenticacion: IAutenticacion): Router {
  const router = Router();
  const controller = createSesionController(gestionUsuarios);

  router.post("/google", validate({ body: googleLoginSchema }), asyncHandler(controller.googleLogin));
  router.get("/me", requiereSesion(autenticacion), asyncHandler(controller.me));
  router.post("/logout", requiereSesion(autenticacion), asyncHandler(controller.logout));

  return router;
}
