import { Router } from "express";
import type { ControlDeAcceso } from "../../shared/middlewares/auth.js";
import type { ILogicaCuotasPagos } from "./interface/i-logica-cuotas-pagos.js";
import { createPagoRoutes } from "./pago/pago.routes.js";

export function createGestionCuotasYPagosRoutes(logica: ILogicaCuotasPagos, acceso: ControlDeAcceso): Router {
  const router = Router();

  router.use("/pagos", createPagoRoutes(logica, acceso));

  return router;
}
