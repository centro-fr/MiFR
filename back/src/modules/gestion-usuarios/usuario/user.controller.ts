import type { Request, Response } from "express";
import type { ILogicaUsuarios } from "./interface/i-logica-usuarios.js";
import type { Rol } from "./user.types.js";

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
      const usuario = await usuarioService.obtenerPorId(req.params.id);
      res.status(200).json(usuario);
    },

    async actualizar(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.actualizar(req.params.id, req.body);
      res.status(200).json(usuario);
    },

    async eliminar(req: Request, res: Response): Promise<void> {
      await usuarioService.eliminar(req.params.id);
      res.status(204).send();
    },

    async asignarRol(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.asignarRol(req.params.id, req.body.rol);
      res.status(201).json(usuario);
    },

    async quitarRol(req: Request, res: Response): Promise<void> {
      const usuario = await usuarioService.quitarRol(req.params.id, req.params.rol as Rol);
      res.status(200).json(usuario);
    },
  };
}

export type UserController = ReturnType<typeof createUserController>;
