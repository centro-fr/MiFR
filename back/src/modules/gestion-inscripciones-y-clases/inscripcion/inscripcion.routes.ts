import { Router } from "express";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import { createInscripcionController } from "./inscripcion.controller.js";
import {
  actualizarHorariosSchema,
  alumnoIdParamSchema,
  cambiarPlanSchema,
  crearInscripcionSchema,
  darDeBajaAlumnoSchema,
  inscripcionIdParamSchema,
  listarInscripcionesQuerySchema,
  reactivarAlumnoSchema,
} from "./inscripcion.schemas.js";
import type { ILogicaInscripcionesYClases } from "../interface/i-logica-inscripciones-y-clases.js";

export function createInscripcionRoutes(
  logica: ILogicaInscripcionesYClases,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createInscripcionController(logica);
  const soloPropietaria = [requiereRol("PROPIETARIA"), requierePermiso(autorizacion, "ALUMNOS_EDITAR")];

  router.use(requiereSesion(autenticacion));
  router.get(
    "/",
    requierePermiso(autorizacion, "ALUMNOS_VER"),
    validate({ query: listarInscripcionesQuerySchema }),
    controller.listar,
  );
  router.post(
    "/",
    requierePermiso(autorizacion, "ALUMNOS_EDITAR"),
    validate({ body: crearInscripcionSchema }),
    controller.crear,
  );
  router.get(
    "/:id",
    requierePermiso(autorizacion, "ALUMNOS_VER"),
    validate({ params: inscripcionIdParamSchema }),
    controller.obtener,
  );
  router.post(
    "/:id/activar",
    ...soloPropietaria,
    validate({ params: inscripcionIdParamSchema }),
    controller.activar,
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

export function createInscripcionAlumnoRoutes(
  logica: ILogicaInscripcionesYClases,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createInscripcionController(logica);

  router.use(requiereSesion(autenticacion), requiereRol("PROPIETARIA"));
  router.post(
    "/:id/baja",
    requierePermiso(autorizacion, "ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: darDeBajaAlumnoSchema }),
    controller.darDeBajaAlumno,
  );
  router.post(
    "/:id/reactivar",
    requierePermiso(autorizacion, "ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: reactivarAlumnoSchema }),
    controller.reactivarAlumno,
  );

  return router;
}
