import type { Request, Response } from "express";
import type { ILogicaPanelDisponibilidad } from "../interface/i-logica-difusion-publica.js";

// El panel es igual para todos los visitantes: un navegador o un proxy pueden reusarlo un minuto, y así
// la recarga de la página no llega cada vez a la base.
const CACHE_PUBLICO = "public, max-age=60";

export function createPanelDisponibilidadController(logica: ILogicaPanelDisponibilidad) {
  return {
    async consultar(_req: Request, res: Response) {
      res.set("Cache-Control", CACHE_PUBLICO).json(await logica.consultarDisponibilidad());
    },
  };
}
