import type { Request, Response } from "express";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaAlumnos } from "../interface/i-logica-personas.js";
import type { ActualizarAlumnoInput, CrearAlumnoInput, ListarAlumnoQuery } from "./alumno.schemas.js";

export function createAlumnoController(logica: ILogicaAlumnos) {
  return {
    async listar(req: Request, res: Response) {
      const pagina = await logica.listarAlumnos(req.query as unknown as ListarAlumnoQuery);
      res.json(pagina);
    },

    async obtener(req: Request, res: Response) {
      const alumno = await logica.obtenerAlumnoPorId(Number(req.params.id));
      res.json(alumno);
    },

    async crear(req: Request, res: Response) {
      const alumno = await logica.crearAlumno(req.body as CrearAlumnoInput);
      res.status(201).json(alumno);
    },

    // US-09: todo cambio queda registrado con quién y cuándo lo hizo.
    async actualizar(req: Request, res: Response) {
      const alumno = await logica.actualizarAlumno(Number(req.params.id), req.body as ActualizarAlumnoInput);
      auditar("ALUMNO_MODIFICADO", {
        por: req.usuario?.id_usuario,
        id_alumno: alumno.id_alumno,
        campos: Object.keys(req.body as object),
      });
      res.json(alumno);
    },
  };
}
