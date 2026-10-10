import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaPagos } from "../interface/i-logica-cuotas-pagos.js";
import { createPagoController } from "./pago.controller.js";
import {
  aprobarTransferenciaSchema,
  informarTransferenciaSchema,
  listarTransferenciasQuerySchema,
  pagoIdParamSchema,
  rechazarTransferenciaSchema,
  registrarEfectivoSchema,
  registrarTransferenciaRecibidaSchema,
} from "./pago.schemas.js";

export function createPagoRoutes(logica: ILogicaPagos, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createPagoController(logica);
  // Revisar transferencias es un dato financiero: rol PROPIETARIA además del permiso, como la matriz.
  const propietariaConfirma = [acceso.rol("PROPIETARIA"), acceso.permiso("PAGOS_CONFIRMAR")];
  // Alumno y tutor no tienen permisos: lo suyo se resuelve por pertenencia, en el service.
  const alumnoOTutor = acceso.rol("ALUMNO", "TUTOR");

  router.use(acceso.sesion);

  router.post(
    "/efectivo",
    acceso.permiso("PAGOS_REGISTRAR"),
    validate({ body: registrarEfectivoSchema }),
    controller.registrarEfectivo,
  );
  router.post(
    "/transferencia",
    alumnoOTutor,
    validate({ body: informarTransferenciaSchema }),
    controller.informarTransferencia,
  );
  router.post(
    "/transferencia-recibida",
    ...propietariaConfirma,
    validate({ body: registrarTransferenciaRecibidaSchema }),
    controller.registrarTransferenciaRecibida,
  );
  router.get("/mis-transferencias", alumnoOTutor, controller.listarMisTransferencias);
  router.get(
    "/transferencias",
    ...propietariaConfirma,
    validate({ query: listarTransferenciasQuerySchema }),
    controller.listarTransferencias,
  );
  router.post(
    "/:id/aprobar",
    ...propietariaConfirma,
    validate({ params: pagoIdParamSchema, body: aprobarTransferenciaSchema }),
    controller.aprobar,
  );
  router.post(
    "/:id/rechazar",
    ...propietariaConfirma,
    validate({ params: pagoIdParamSchema, body: rechazarTransferenciaSchema }),
    controller.rechazar,
  );
  router.get("/:id/comprobante", validate({ params: pagoIdParamSchema }), controller.comprobante);

  return router;
}
