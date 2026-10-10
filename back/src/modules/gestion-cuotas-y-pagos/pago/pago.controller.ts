import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import { auditar, type EventoSeguridad } from "../../../shared/utils/auditoria.js";
import type { ILogicaPagos } from "../interface/i-logica-cuotas-pagos.js";
import type {
  AprobarTransferenciaInput,
  InformarTransferenciaInput,
  ListarTransferenciasQuery,
  RechazarTransferenciaInput,
  RegistrarEfectivoInput,
  RegistrarTransferenciaRecibidaInput,
} from "./pago.schemas.js";
import type { Pago } from "./pago.types.js";

// Los movimientos de dinero quedan en la auditoría con quién los hizo.
function auditarPago(evento: EventoSeguridad, req: Request, pago: Pago): void {
  auditar(evento, {
    por: req.usuario?.id_usuario,
    id_pago: pago.id_pago,
    monto: pago.monto,
    estado: pago.estado,
  });
}

export function createPagoController(logica: ILogicaPagos) {
  return {
    async registrarEfectivo(req: Request, res: Response) {
      const pago = await logica.registrarCobroEfectivo(
        req.body as RegistrarEfectivoInput,
        solicitanteDe(req),
      );
      auditarPago("COBRO_EFECTIVO_REGISTRADO", req, pago);
      res.status(201).json(pago);
    },

    async informarTransferencia(req: Request, res: Response) {
      const pago = await logica.informarTransferencia(
        req.body as InformarTransferenciaInput,
        solicitanteDe(req),
      );
      res.status(201).json(pago);
    },

    async registrarTransferenciaRecibida(req: Request, res: Response) {
      const pago = await logica.registrarTransferenciaRecibida(
        req.body as RegistrarTransferenciaRecibidaInput,
        solicitanteDe(req),
      );
      auditarPago("TRANSFERENCIA_RECIBIDA_REGISTRADA", req, pago);
      res.status(201).json(pago);
    },

    async aprobar(req: Request, res: Response) {
      const pago = await logica.aprobarTransferencia(
        Number(req.params.id),
        req.body as AprobarTransferenciaInput,
        solicitanteDe(req),
      );
      auditarPago("TRANSFERENCIA_APROBADA", req, pago);
      res.json(pago);
    },

    async rechazar(req: Request, res: Response) {
      const pago = await logica.rechazarTransferencia(
        Number(req.params.id),
        req.body as RechazarTransferenciaInput,
        solicitanteDe(req),
      );
      auditarPago("TRANSFERENCIA_RECHAZADA", req, pago);
      res.json(pago);
    },

    async listarTransferencias(req: Request, res: Response) {
      res.json(await logica.listarTransferencias(req.query as unknown as ListarTransferenciasQuery));
    },

    async listarMisTransferencias(req: Request, res: Response) {
      res.json(await logica.listarMisTransferencias(solicitanteDe(req)));
    },

    async comprobante(req: Request, res: Response) {
      res.json(await logica.obtenerComprobante(Number(req.params.id), solicitanteDe(req)));
    },
  };
}
