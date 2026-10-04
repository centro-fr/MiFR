import type { Request, Response } from "express";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import type { ActualizarHorarioInput, CrearHorarioInput, ListarHorarioQuery } from "./horario.schemas.js";

export function createHorarioController(logica: ILogicaServicioEntrenamiento) {
  return {
    async listar(req: Request, res: Response) {
      res.json(await logica.listarHorarios(req.query as ListarHorarioQuery));
    },

    async obtener(req: Request, res: Response) {
      res.json(await logica.obtenerHorarioPorId(Number(req.params.id)));
    },

    async crear(req: Request, res: Response) {
      res.status(201).json(await logica.crearHorario(req.body as CrearHorarioInput));
    },

    async actualizar(req: Request, res: Response) {
      res.json(await logica.actualizarHorario(Number(req.params.id), req.body as ActualizarHorarioInput));
    },

    async darDeBaja(req: Request, res: Response) {
      res.json(await logica.darDeBajaHorario(Number(req.params.id)));
    },
  };
}
