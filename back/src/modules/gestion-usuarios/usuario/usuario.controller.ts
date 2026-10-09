import type { Request, Response } from "express";
import { auditar } from "../../../shared/utils/auditoria.js";
import type { ILogicaCuentasDeUsuario } from "../interface/i-logica-usuarios.js";
import type { CodigoRol } from "./usuario.types.js";

export function createUsuarioController(gestionUsuarios: ILogicaCuentasDeUsuario) {
  return {
    async crear(req: Request, res: Response): Promise<void> {
      const usuario = await gestionUsuarios.crearUsuario(req.body);
      res.status(201).json(usuario);
    },

    async listar(_req: Request, res: Response): Promise<void> {
      const usuarios = await gestionUsuarios.listarUsuarios();
      res.status(200).json(usuarios);
    },

    async obtenerPorId(req: Request, res: Response): Promise<void> {
      const usuario = await gestionUsuarios.obtenerUsuarioPorId(Number(req.params.id));
      res.status(200).json(usuario);
    },

    async actualizar(req: Request, res: Response): Promise<void> {
      const usuario = await gestionUsuarios.actualizarUsuario(Number(req.params.id), req.body);
      if (req.body.estado) {
        auditar("ESTADO_USUARIO_MODIFICADO", {
          por: req.usuario?.id_usuario,
          id_usuario: usuario.id_usuario,
          estado: req.body.estado,
        });
      }
      res.status(200).json(usuario);
    },

    async eliminar(req: Request, res: Response): Promise<void> {
      await gestionUsuarios.eliminarUsuario(Number(req.params.id));
      res.status(204).send();
    },

    async asignarRol(req: Request, res: Response): Promise<void> {
      const usuario = await gestionUsuarios.asignarRol(Number(req.params.id), req.body.rol);
      auditar("ROL_ASIGNADO", {
        por: req.usuario?.id_usuario,
        id_usuario: usuario.id_usuario,
        rol: req.body.rol,
      });
      res.status(201).json(usuario);
    },

    async quitarRol(req: Request, res: Response): Promise<void> {
      const usuario = await gestionUsuarios.quitarRol(Number(req.params.id), req.params.rol as CodigoRol);
      auditar("ROL_QUITADO", {
        por: req.usuario?.id_usuario,
        id_usuario: usuario.id_usuario,
        rol: req.params.rol,
      });
      res.status(200).json(usuario);
    },
  };
}
