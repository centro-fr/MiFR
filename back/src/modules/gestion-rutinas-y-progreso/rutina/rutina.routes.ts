import { Router } from "express";
import { ForbiddenError } from "../../../shared/errors/app-error.js";
import type { ControlDeAcceso, Guardia } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaRutinas } from "../interface/i-logica-rutinas-y-progreso.js";
import { createRutinaController } from "./rutina.controller.js";
import { alumnoRutinasParamsSchema, crearRutinaSchema } from "./rutina.schemas.js";

// Pasa con el primer guardia que lo deje; cualquier otro error (sesión, base) sigue de largo.
function cualquieraDe(...guardias: Guardia[]): Guardia {
  return async (req, res, next) => {
    for (const guardia of guardias) {
      let paso = false;
      try {
        await guardia(req, res, () => {
          paso = true;
        });
      } catch (error) {
        if (!(error instanceof ForbiddenError)) throw error;
      }
      if (paso) return next();
    }
    throw new ForbiddenError();
  };
}

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

  return router;
}