import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { cualquieraDe } from "../cualquiera-de.js";
import type { ILogicaProgreso } from "../interface/i-logica-rutinas-y-progreso.js";
import { createProgresoController } from "./progreso.controller.js";
import {
  actualizarProgresoSchema,
  alumnoProgresoParamsSchema,
  registrarProgresoSchema,
  registroProgresoParamsSchema,
} from "./progreso.schemas.js";

// Igual que las rutinas: el permiso abre la pantalla y Progreso decide qué alumno puede ver o cargar cada uno.
// Cargar, corregir y dar de baja piden RUTINAS_EDITAR; el service exige además que el alumno esté a cargo de la
// profesora.
export function createProgresoRoutes(logica: ILogicaProgreso, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createProgresoController(logica);
  const ver = cualquieraDe(acceso.permiso("RUTINAS_VER"), acceso.permiso("RUTINAS_VER_PROPIAS"));

  router.post(
    "/progreso",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ body: registrarProgresoSchema }),
    controller.registrar,
  );
  router.patch(
    "/progreso/:id",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ params: registroProgresoParamsSchema, body: actualizarProgresoSchema }),
    controller.actualizar,
  );
  router.delete(
    "/progreso/:id",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ params: registroProgresoParamsSchema }),
    controller.eliminar,
  );
  router.get(
    "/alumnos/:id/progreso",
    acceso.sesion,
    ver,
    validate({ params: alumnoProgresoParamsSchema }),
    controller.listarDeAlumno,
  );
  router.get("/progreso/mi-progreso", acceso.sesion, ver, controller.miProgreso);

  return router;
}
