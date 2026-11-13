import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { cualquieraDe } from "../cualquiera-de.js";
import type { ILogicaRutinas } from "../interface/i-logica-rutinas-y-progreso.js";
import { createRutinaController } from "./rutina.controller.js";
import {
  alumnoRutinasParamsSchema,
  crearRutinaSchema,
  rutinaIdParamsSchema,
  actualizarRutinaSchema,
} from "./rutina.schemas.js";

// El permiso abre la pantalla; qué alumno puede ver o cargar cada uno lo decide Rutina con el solicitante.
// Cargar pide RUTINAS_EDITAR; leer, RUTINAS_VER (profesora y propietaria) o RUTINAS_VER_PROPIAS (alumno y tutor).
export function createRutinaRoutes(logica: ILogicaRutinas, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createRutinaController(logica);
  const ver = cualquieraDe(acceso.permiso("RUTINAS_VER"), acceso.permiso("RUTINAS_VER_PROPIAS"));

  router.post(
    "/rutinas",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ body: crearRutinaSchema }),
    controller.crear,
  );
  router.put(
    "/rutinas/:id",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ params: rutinaIdParamsSchema, body: actualizarRutinaSchema }),
    controller.actualizar,
  );
  router.delete(
    "/rutinas/:id",
    acceso.sesion,
    acceso.permiso("RUTINAS_EDITAR"),
    validate({ params: rutinaIdParamsSchema }),
    controller.eliminar,
  );
  router.get(
    "/alumnos/:id/rutinas",
    acceso.sesion,
    ver,
    validate({ params: alumnoRutinasParamsSchema }),
    controller.listarDeAlumno,
  );
  router.get(
    "/alumnos/:id/rutinas/vigente",
    acceso.sesion,
    ver,
    validate({ params: alumnoRutinasParamsSchema }),
    controller.vigente,
  );
  router.get("/rutinas/mi-rutina", acceso.sesion, ver, controller.miRutina);
  router.get("/rutinas/mis-rutinas", acceso.sesion, ver, controller.misRutinas);

  return router;
}
