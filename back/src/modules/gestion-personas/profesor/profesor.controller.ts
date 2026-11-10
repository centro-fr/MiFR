import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaProfesoras } from "../interface/i-logica-personas.js";
import type { ActualizarProfesoraInput, CrearProfesoraInput } from "./profesor.schemas.js";

export function createProfesorController(logica: ILogicaProfesoras) {
  return {
    async listar(req: Request, res: Response) {
      const incluirBajas = req.query.incluirBajas === "true" || req.query.incluir_bajas === "true";
      const { esPropietaria } = solicitanteDe(req);
      res.json(await logica.listarProfesoras({ incluirBajas }, esPropietaria));
    },

    async crear(req: Request, res: Response) {
      res.status(201).json(await logica.crearProfesora(req.body as CrearProfesoraInput));
    },

    async darDeBaja(req: Request, res: Response) {
      res.json(await logica.darDeBajaProfesora(Number(req.params.id)));
    },

    async actualizar(req: Request, res: Response) {
      res.json(await logica.actualizarProfesora(Number(req.params.id), req.body as ActualizarProfesoraInput));
    },
  };
}
