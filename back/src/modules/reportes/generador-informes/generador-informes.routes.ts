import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaGeneradorInformes } from "../interface/i-logica-informes.js";
import { createGeneradorInformesController } from "./generador-informes.controller.js";
import {
  estadisticasInscripcionesQuerySchema,
  estadisticasPlanesQuerySchema,
  informeAsistenciaQuerySchema,
  informeCobranzaQuerySchema,
  informeCuotasVencidasQuerySchema,
  informeOcupacionQuerySchema,
} from "./generador-informes.schemas.js";

// US-33 a US-37 y cobranza: reportes administrativos reservados a la propietaria. El ranking de
// asistencia (US-30), que ven todos los roles, lo monta GestionInsignias.
export function createGeneradorInformesRoutes(
  logica: ILogicaGeneradorInformes,
  acceso: ControlDeAcceso,
): Router {
  const router = Router();
  const controller = createGeneradorInformesController(logica);

  router.use(acceso.sesion, acceso.rol("PROPIETARIA"), acceso.permiso("REPORTES_COBRANZA_VER"));

  router.get(
    "/cuotas-vencidas",
    validate({ query: informeCuotasVencidasQuerySchema }),
    controller.cuotasVencidas,
  );
  router.get("/cobranza", validate({ query: informeCobranzaQuerySchema }), controller.cobranza);
  router.get("/planes", validate({ query: estadisticasPlanesQuerySchema }), controller.planes);
  router.get(
    "/inscripciones",
    validate({ query: estadisticasInscripcionesQuerySchema }),
    controller.inscripciones,
  );
  router.get("/asistencia", validate({ query: informeAsistenciaQuerySchema }), controller.asistencia);
  router.get("/ocupacion", validate({ query: informeOcupacionQuerySchema }), controller.ocupacion);

  return router;
}
