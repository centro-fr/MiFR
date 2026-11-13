import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaRutinas } from "../interface/i-logica-rutinas-y-progreso.js";
import type { ActualizarRutinaInput, CrearRutinaInput } from "./rutina.schemas.js";

export function createRutinaController(logica: ILogicaRutinas) {
  return {
    async crear(req: Request, res: Response): Promise<void> {
      res.status(201).json(await logica.crearRutina(req.body as CrearRutinaInput, solicitanteDe(req)));
    },

    async actualizar(req: Request, res: Response): Promise<void> {
      res.json(
        await logica.actualizarRutina(
          Number(req.params.id),
          req.body as ActualizarRutinaInput,
          solicitanteDe(req),
        ),
      );
    },

    async eliminar(req: Request, res: Response): Promise<void> {
      await logica.eliminarRutina(Number(req.params.id), solicitanteDe(req));
      res.status(204).send();
    },

    async listarDeAlumno(req: Request, res: Response): Promise<void> {
      res.json(await logica.listarRutinasDeAlumno(Number(req.params.id), solicitanteDe(req)));
    },

    // Sin rutina responde 200 con null, no 404: el portal lo muestra como estado vacío (US-28).
    async vigente(req: Request, res: Response): Promise<void> {
      res.json(await logica.obtenerRutinaVigente(Number(req.params.id), solicitanteDe(req)));
    },

    async miRutina(req: Request, res: Response): Promise<void> {
      res.json(await logica.obtenerMiRutina(solicitanteDe(req)));
    },

    async misRutinas(req: Request, res: Response): Promise<void> {
      res.json(await logica.listarMiRutinas(solicitanteDe(req)));
    },
  };
}
