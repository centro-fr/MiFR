import { Router } from "express";
import { requierePermiso, requiereRol, requiereSesion } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import { asyncHandler } from "../../../shared/utils/async-handler.js";
import type { IAutorizacion } from "../../gestion-usuarios/rol/interface/i-autorizacion.js";
import type { IAutenticacion } from "../../gestion-usuarios/sesion/interface/i-autenticacion.js";
import type { ILogicaPersonas } from "../interface/i-logica-personas.js";
import { createAlumnoController } from "./alumno.controller.js";
import {
  actualizarAlumnoSchema,
  alumnoIdParamSchema,
  crearAlumnoSchema,
  listarAlumnoQuerySchema,
} from "./alumno.schemas.js";

export function createAlumnoRoutes(
  logica: ILogicaPersonas,
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): Router {
  const router = Router();
  const controller = createAlumnoController(logica);
  // La profesora solo puede ver y editar a los alumnos a su cargo (US-10), que salen de las
  // inscripciones. Hasta que exista ese componente, la consulta y la edición son de la propietaria.
  const soloPropietaria = requiereRol("PROPIETARIA");

  router.use(requiereSesion(autenticacion));

  router.get(
    "/",
    soloPropietaria,
    requierePermiso(autorizacion, "ALUMNOS_VER"),
    validate({ query: listarAlumnoQuerySchema }),
    asyncHandler(controller.listar),
  );
  router.post(
    "/",
    requierePermiso(autorizacion, "ALUMNOS_EDITAR"),
    validate({ body: crearAlumnoSchema }),
    asyncHandler(controller.crear),
  );
  router.get(
    "/:id",
    soloPropietaria,
    requierePermiso(autorizacion, "ALUMNOS_VER"),
    validate({ params: alumnoIdParamSchema }),
    asyncHandler(controller.obtener),
  );
  router.patch(
    "/:id",
    soloPropietaria,
    requierePermiso(autorizacion, "ALUMNOS_EDITAR"),
    validate({ params: alumnoIdParamSchema, body: actualizarAlumnoSchema }),
    asyncHandler(controller.actualizar),
  );

  return router;
}
