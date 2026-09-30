import type { Request, Response } from "express";
import type { ILogicaServicioEntrenamiento } from "../interface/i-logica-servicio-entrenamiento.js";
import type {
  ActualizarActividadInput,
  CrearActividadInput,
  ListarActividadQuery,
} from "./actividad.schemas.js";

export function createActividadController(logica: ILogicaServicioEntrenamiento) {
  return {
    async listar(req: Request<{}, {}, {}, ListarActividadQuery>, res: Response) {
      const actividades = await logica.listarActividades(req.query);
      res.json(actividades);
    },

    async obtener(req: Request, res: Response) {
      const actividad = await logica.obtenerActividadPorId(Number(req.params.id));
      res.json(actividad);
    },

    async crear(req: Request, res: Response) {
      const actividad = await logica.crearActividad(req.body as CrearActividadInput);
      res.status(201).json(actividad);
    },

    async actualizar(req: Request, res: Response) {
      const actividad = await logica.actualizarActividad(
        Number(req.params.id),
        req.body as ActualizarActividadInput,
      );
      res.json(actividad);
    },

    async baja(req: Request, res: Response) {
      const result = await logica.darDeBajaActividad(Number(req.params.id));
      res.json(result);
    },
  };
}
