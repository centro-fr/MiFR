import type { Request, Response } from "express";
import type { ILogicaUsuarios } from "./interface/i-logica-usuarios.js";
import type { CodigoRol } from "./user.types.js";

export function createUserController(usuarioService: ILogicaUsuarios) {
  return {
    async crear(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.crear(req.body);
      res.status(201).json(usuario);
    },

    async listar(_req: Request, res: Response): Promise<void> {
      const usuarios = await usuarioService.listar();
      res.status(200).json(usuarios);
    },

    async obtenerPorId(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.obtenerPorId(Number(req.params.id));
      res.status(200).json(usuario);
    },

    async actualizar(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.actualizar(Number(req.params.id), req.body);
      res.status(200).json(usuario);
    },

    async eliminar(req: Request, res: Response): Promise<void> {
      await usuarioService.eliminar(Number(req.params.id));
      res.status(204).send();
    },

    async asignarRol(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.asignarRol(Number(req.params.id), req.body.rol);
      res.status(201).json(usuario);
    },

    async quitarRol(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.quitarRol(Number(req.params.id), req.params.rol as CodigoRol);
      res.status(200).json(usuario);
    },
  };
}

export type UserController = ReturnType<typeof createUserController>;
