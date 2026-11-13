import type { Request, Response } from "express";
import { solicitanteDe } from "../../../shared/middlewares/auth.js";
import type { ILogicaInscripciones } from "../interface/i-logica-inscripciones-y-clases.js";
import type {
  ActualizarHorariosInput,
  CambiarPlanInput,
  CrearInscripcionInput,
  DarDeBajaAlumnoInput,
  ListarInscripcionesQuery,
  PreinscribirInput,
  ReactivarAlumnoInput,
} from "./inscripcion.schemas.js";

export function createInscripcionController(logica: ILogicaInscripciones) {
  return {
    async listar(req: Request, res: Response) {
      res.json(
        await logica.listarInscripciones(
          req.query as unknown as ListarInscripcionesQuery,
          solicitanteDe(req),
        ),
      );
    },

    async crear(req: Request, res: Response) {
      res
        .status(201)
        .json(await logica.crearInscripcion(req.body as CrearInscripcionInput, solicitanteDe(req)));
    },

    async preinscribir(req: Request, res: Response) {
      res.status(201).json(await logica.preinscribir(req.body as PreinscribirInput, solicitanteDe(req)));
    },

    async obtener(req: Request, res: Response) {
      res.json(await logica.obtenerInscripcion(Number(req.params.id), solicitanteDe(req)));
    },

    async darDeBajaAlumno(req: Request, res: Response) {
      await logica.darDeBajaAlumno(Number(req.params.id), req.body as DarDeBajaAlumnoInput);
      res.json({ mensaje: "Alumno dado de baja" });
    },

    async reactivarAlumno(req: Request, res: Response) {
      res
        .status(201)
        .json(await logica.reactivarAlumno(Number(req.params.id), req.body as ReactivarAlumnoInput));
    },

    // 202 si el cambio quedó programado para cuando termine la gracia; 200 si se aplicó.
    async cambiarPlan(req: Request, res: Response) {
      const resultado = await logica.cambiarPlan(Number(req.params.id), req.body as CambiarPlanInput);
      res.status("fecha_aplicacion" in resultado ? 202 : 200).json(resultado);
    },

    async cancelarCambioPlan(req: Request, res: Response) {
      await logica.cancelarCambioPlan(Number(req.params.id));
      res.status(204).end();
    },

    async actualizarHorarios(req: Request, res: Response) {
      res.json(await logica.actualizarHorarios(Number(req.params.id), req.body as ActualizarHorariosInput));
    },
  };
}
