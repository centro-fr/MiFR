import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaRutinas } from "../interface/i-logica-rutinas-y-progreso.js";
import type { CrearRutinaInput } from "./rutina.schemas.js";

export function createRutinaController(logica: ILogicaRutinas) {
  return {
    async crear(req: Request, res: Response): Promise<void> {
      res.status(201).json(await logica.crearRutina(req.body as CrearRutinaInput, solicitanteDe(req)));
    },

    async listarDeAlumno(req: Request, res: Response): Promise<void> {
      res.json(await logica.listarRutinasDeAlumno(Number(req.params.id), solicitanteDe(req)));
    },

    // Sin rutina responde 200 con null, no 404: el portal lo muestra como estado vacío (US-28).
    async vigente(req: Request, res: Response): Promise<void> {
      res.json(await logica.obtenerRutinaVigente(Number(req.params.id), solicitanteDe(req)));
    },
  };
}
