import type { Request, Response } from "express";
import type { ILogicaGeneradorInformes } from "../interface/i-logica-informes.js";
import type {
  EstadisticasInscripcionesQuery,
  EstadisticasPlanesQuery,
  InformeCobranzaQuery,
  InformeCuotasVencidasQuery,
} from "./generador-informes.schemas.js";

export function createGeneradorInformesController(logica: ILogicaGeneradorInformes) {
  return {
    async cuotasVencidas(req: Request, res: Response) {
      res.json(await logica.informeCuotasVencidas(req.query as unknown as InformeCuotasVencidasQuery));
    },

    async cobranza(req: Request, res: Response) {
      res.json(await logica.informeCobranza(req.query as unknown as InformeCobranzaQuery));
    },

    async planes(req: Request, res: Response) {
      res.json(await logica.estadisticasPlanes(req.query as unknown as EstadisticasPlanesQuery));
    },

    async inscripciones(req: Request, res: Response) {
      res.json(
        await logica.estadisticasInscripciones(req.query as unknown as EstadisticasInscripcionesQuery),
      );
    },
  };
}
