import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaAlumnosInactivos } from "../interface/i-logica-informes.js";
import type {
  ListarAlumnosInactivosQuery,
  RegistrarSeguimientoInput,
} from "./detector-inactividad.schemas.js";

export function createDetectorInactividadController(logica: ILogicaAlumnosInactivos) {
  return {
    async listar(req: Request, res: Response) {
      res.json(await logica.listarAlumnosInactivos(req.query as unknown as ListarAlumnosInactivosQuery));
    },

    async registrarSeguimiento(req: Request, res: Response) {
      const { idUsuario } = solicitanteDe(req);
      res.json(
        await logica.registrarSeguimientoInactividad(
          Number(req.params.idInscripcion),
          req.body as RegistrarSeguimientoInput,
          idUsuario,
        ),
      );
    },

    async quitarSeguimiento(req: Request, res: Response) {
      await logica.quitarSeguimientoInactividad(Number(req.params.idInscripcion));
      res.status(204).send();
    },
  };
}
