import type { Request, Response } from "express";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";

export function createRolController(gestionUsuarios: ILogicaUsuarios) {
  return {
    async obtenerMatriz(_req: Request, res: Response): Promise<void> {
      res.status(200).json(await gestionUsuarios.obtenerMatriz());
    },

    async actualizarMatriz(req: Request, res: Response): Promise<void> {
      await gestionUsuarios.actualizarMatriz(req.body.cambios);
      auditar("MATRIZ_PERMISOS_MODIFICADA", { por: req.usuario?.id_usuario, cambios: req.body.cambios });
      res.status(200).json({ mensaje: "Matriz de permisos actualizada exitosamente" });
    },
  };
}
