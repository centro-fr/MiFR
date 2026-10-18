import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaNotificacionesPropias } from "../interface/i-logica-notificaciones.js";
import type { ListarNotificacionesQuery } from "./notificacion.schemas.js";

// Todas las operaciones son sobre las notificaciones de quien pide: el id del destinatario sale de la
// sesión, nunca del pedido.
export function createNotificacionController(logica: ILogicaNotificacionesPropias) {
  return {
    async listarMias(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      res.json(
        await logica.listarNotificacionesPropias(
          idUsuario,
          req.query as unknown as ListarNotificacionesQuery,
        ),
      );
    },

    async marcarLeida(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      res.json(await logica.marcarNotificacionLeida(Number(req.params.id), idUsuario));
    },

    async marcarTodasLeidas(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      res.json(await logica.marcarNotificacionesLeidas(idUsuario));
    },
  };
}
