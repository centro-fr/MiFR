import type { Request, Response } from "express";
import type { IAutenticacion } from "./interface/i-autenticacion.js";
import type { UsuarioRol } from "../usuario/user.types.js";

export function createSesionController(autenticacion: IAutenticacion) {
  return {
    async googleLogin(req: Request, res: Response): Promise<void> {
      const { token, usuario } = await autenticacion.iniciarSesion(req.body.id_token);
      res.status(200).json({ token, usuario, roles: usuario.roles.map((r: UsuarioRol) => r.rol) });
    },
  };
}
