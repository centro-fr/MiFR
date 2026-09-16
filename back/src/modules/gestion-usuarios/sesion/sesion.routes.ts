import { Router } from "express";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import { createSesionController } from "./sesion.controller.js";
import { googleLoginSchema } from "./sesion.schemas.js";
import type { IAutenticacion } from "./interface/i-autenticacion.js";

export function createSesionRoutes(autenticacion: IAutenticacion): Router {
  const router = Router();
  const controller = createSesionController(autenticacion);

  router.post("/google", validate({ body: googleLoginSchema }), asyncHandler(controller.googleLogin));

  return router;
}
