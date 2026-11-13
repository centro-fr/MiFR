import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaSuscripcionesPush } from "../interface/i-logica-notificaciones.js";
import type { BajaSuscripcionPushBody, SuscripcionPushBody } from "./suscripcion-push.schemas.js";

// El dueño del dispositivo sale de la sesión, nunca del pedido.
export function createSuscripcionPushController(logica: ILogicaSuscripcionesPush) {
  return {
    clavePublica(_req: Request, res: Response) {
      res.json({ clave_publica: logica.obtenerClavePushPublica() });
    },

    async suscribir(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      await logica.suscribirDispositivo(idUsuario, req.body as SuscripcionPushBody);
      res.status(204).end();
    },

    async darDeBaja(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      await logica.desuscribirDispositivo(idUsuario, (req.body as BajaSuscripcionPushBody).endpoint);
      res.status(204).end();
    },
  };
}
