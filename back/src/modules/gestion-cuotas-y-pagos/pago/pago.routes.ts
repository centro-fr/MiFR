import { Router } from "express";
import type { ControlDeAcceso } from "../../../shared/middlewares/auth.js";
import { validate } from "../../../shared/middlewares/validate.js";
import type { ILogicaPagos } from "../interface/i-logica-cuotas-pagos.js";
import { createPagoController } from "./pago.controller.js";
import {
  aprobarTransferenciaSchema,
  efectivoPendienteQuerySchema,
  informarTransferenciaSchema,
  listarTransferenciasQuerySchema,
  pagoIdParamSchema,
  rechazarTransferenciaSchema,
  registrarEfectivoSchema,
  registrarTransferenciaRecibidaSchema,
  rendicionesQuerySchema,
  rendirLoteSchema,
  rendirPagoSchema,
} from "./pago.schemas.js";

export function createPagoRoutes(logica: ILogicaPagos, acceso: ControlDeAcceso): Router {
  const router = Router();
  const controller = createPagoController(logica);
  // Revisar transferencias es un dato financiero: rol PROPIETARIA además del permiso, como la matriz.
  const propietariaConfirma = [acceso.rol("PROPIETARIA"), acceso.permiso("PAGOS_CONFIRMAR")];
  // US-19: la rendición del efectivo es de la propietaria; PAGOS_RENDICION_VER ya es exclusivo.
  const propietariaRinde = [acceso.rol("PROPIETARIA"), acceso.permiso("PAGOS_RENDICION_VER")];
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
  router.get(
    "/efectivo-pendiente",
    ...propietariaRinde,
    validate({ query: efectivoPendienteQuerySchema }),
    controller.efectivoPendiente,
  );
  router.get(
    "/rendiciones",
    ...propietariaRinde,
    validate({ query: rendicionesQuerySchema }),
    controller.rendiciones,
  );
  router.post("/rendir", ...propietariaRinde, validate({ body: rendirLoteSchema }), controller.rendirLote);
  router.post(
    "/:id/rendir",
    ...propietariaRinde,
    validate({ params: pagoIdParamSchema, body: rendirPagoSchema }),
    controller.rendir,
  );
  router.get("/:id/comprobante", validate({ params: pagoIdParamSchema }), controller.comprobante);

  return router;
}
