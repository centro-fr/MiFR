import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaClasesYAsistencia } from "../interface/i-logica-inscripciones-y-clases.js";
import type { MarcarAsistenciaHttpInput } from "../asistencia/asistencia.schemas.js";

export function createClaseController(logica: ILogicaClasesYAsistencia) {
  return {
    async listarDelDia(req: Request, res: Response) {
      res.json(await logica.listarClasesDeHoy(solicitanteDe(req)));
    },

    async obtenerAsistencia(req: Request, res: Response) {
      res.json(await logica.obtenerAsistenciaDeClase(Number(req.params.id), solicitanteDe(req)));
    },

    async marcar(req: Request, res: Response) {
      await logica.marcarAsistencia(
        Number(req.params.id),
        Number(req.params.idAlumno),
        req.body as MarcarAsistenciaHttpInput,
        solicitanteDe(req),
      );
      res.json({ mensaje: "Asistencia registrada" });
    },

    async marcarTodosPresentes(req: Request, res: Response) {
      await logica.marcarTodosPresentes(Number(req.params.id), solicitanteDe(req));
      res.json({ mensaje: "Todos los inscriptos quedaron presentes" });
    },

    async cerrar(req: Request, res: Response) {
      res.json(await logica.cerrarAsistencia(Number(req.params.id), solicitanteDe(req)));
    },
  };
}
