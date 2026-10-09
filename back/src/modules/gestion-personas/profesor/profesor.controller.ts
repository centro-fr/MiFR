import type { Request, Response } from "express";
import type { ILogicaProfesoras } from "../interface/i-logica-personas.js";
import type { CrearProfesoraInput } from "./profesor.schemas.js";

export function createProfesorController(logica: ILogicaProfesoras) {
  return {
    async listar(_req: Request, res: Response) {
      res.json(await logica.listarProfesoras());
    },

    async crear(req: Request, res: Response) {
      res.status(201).json(await logica.crearProfesora(req.body as CrearProfesoraInput));
    },

    async darDeBaja(req: Request, res: Response) {
      res.json(await logica.darDeBajaProfesora(Number(req.params.id)));
    },
  };
}
