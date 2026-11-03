import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaProgreso } from "../interface/i-logica-rutinas-y-progreso.js";
import type { ActualizarProgresoInput, RegistrarProgresoInput } from "./progreso.schemas.js";

export function createProgresoController(logica: ILogicaProgreso) {
  return {
    async registrar(req: Request, res: Response): Promise<void> {
      res
        .status(201)
        .json(await logica.registrarProgreso(req.body as RegistrarProgresoInput, solicitanteDe(req)));
    },

    async listarDeAlumno(req: Request, res: Response): Promise<void> {
      res.json(await logica.listarProgresoDeAlumno(Number(req.params.id), solicitanteDe(req)));
    },

    async actualizar(req: Request, res: Response): Promise<void> {
      res.json(
        await logica.actualizarProgreso(
          Number(req.params.id),
          req.body as ActualizarProgresoInput,
          solicitanteDe(req),
        ),
      );
    },

    async eliminar(req: Request, res: Response): Promise<void> {
      await logica.eliminarProgreso(Number(req.params.id), solicitanteDe(req));
      res.status(204).send();
    },

    async miProgreso(req: Request, res: Response): Promise<void> {
      res.json(await logica.listarMiProgreso(solicitanteDe(req)));
    },
  };
}
