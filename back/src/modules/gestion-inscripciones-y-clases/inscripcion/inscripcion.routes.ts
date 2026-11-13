import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { createInscripcionController } from "./inscripcion.controller.js";
import {
  actualizarHorariosSchema,
  alumnoIdParamSchema,
  cambiarPlanSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  inscripcionIdParamSchema,
  listarInscripcionesQuerySchema,
  preinscribirSchema,
  reactivarAlumnoSchema,
} from "./inscripcion.schemas.js";
import type { ILogicaInscripciones } from "../interface/i-logica-inscripciones-y-clases.js";

export function createInscripcionRoutes(logica: ILogicaInscripciones, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createInscripcionController(logica);
  const soloPropietaria = [acceso.rol("PROPIETARIA"), acceso.permiso("ALUMNOS_EDITAR")];

  router.use(acceso.sesion);
  router.get(
    "/",
    acceso.permiso("ALUMNOS_VER"),
    validate({ query: listarInscripcionesQuerySchema }),
    controller.listar,
  );
  router.post(
    "/",
    acceso.permiso("ALUMNOS_EDITAR"),
    validate({ body: crearInscripcionSchema }),
    controller.crear,
  );
  router.get(
    "/:id",
    acceso.permiso("ALUMNOS_VER"),
    validate({ params: inscripcionIdParamSchema }),
    controller.obtener,
  );
  router.post(
    "/:id/cambio-plan",
    ...soloPropietaria,
    validate({ params: inscripcionIdParamSchema, body: cambiarPlanSchema }),
    controller.cambiarPlan,
  );
  router.patch(
    "/:id/horarios",
    ...soloPropietaria,
    validate({ params: inscripcionIdParamSchema, body: actualizarHorariosSchema }),
    controller.actualizarHorarios,
  );

  return router;
}

// US-05: el mismo permiso que dar de alta un alumno y pre-inscribirlo por separado.
export function createPreinscripcionRoutes(logica: ILogicaInscripciones, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createInscripcionController(logica);

  router.use(acceso.sesion);
  router.post(
    "/",
    acceso.permiso("ALUMNOS_EDITAR"),
    validate({ body: preinscribirSchema }),
    controller.preinscribir,
  );

  return router;
}

export function createInscripcionAlumnoRoutes(logica: ILogicaInscripciones, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createInscripcionController(logica);

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"));
  router.post(
    "/:id/baja",
    acceso.permiso("ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: darDeBajaAlumnoSchema }),
    controller.darDeBajaAlumno,
  );
  router.post(
    "/:id/reactivar",
    acceso.permiso("ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: reactivarAlumnoSchema }),
    controller.reactivarAlumno,
  );

  return router;
}
