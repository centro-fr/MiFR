import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaInsigniasDeAlumnos } from "../interface/i-logica-insignias.js";
import type { RankingAsistenciaQuery } from "./insignia.schemas.js";

export function createInsigniaController(logica: ILogicaInsigniasDeAlumnos) {
  return {
    async ficha(req: Request, res: Response): Promise<void> {
      res.json(await logica.obtenerFichaInsignias(Number(req.params.id), solicitanteDe(req)));
    },

    async ranking(req: Request, res: Response): Promise<void> {
      const filtro = req.query as unknown as RankingAsistenciaQuery;
      res.json(await logica.consultarRankingAsistencia(filtro, solicitanteDe(req)));
    },
  };
}
