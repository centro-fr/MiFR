import type { Request, Response } from "express";
import type { ILogicaResumenDiario } from "../interface/i-logica-notificaciones.js";

export function createResumenDiarioController(logica: ILogicaResumenDiario) {
  return {
    async obtener(_req: Request, res: Response) {
      res.json(await logica.obtenerResumenDiario());
    },
  };
}
