import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import type { ILogicaResumenDiario } from "../interface/i-logica-notificaciones.js";
import { createResumenDiarioController } from "./resumen-diario-propietaria.controller.js";

// US-26: el resumen es visible solo para la propietaria. La spec lo ata al rol, no a un permiso que se
// pueda delegar: trae datos financieros de todas las profesoras.
export function createResumenDiarioRoutes(logica: ILogicaResumenDiario, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createResumenDiarioController(logica);

  router.get("/", acceso.sesion, acceso.rol("PROPIETARIA"), controller.obtener);

  return router;
}
