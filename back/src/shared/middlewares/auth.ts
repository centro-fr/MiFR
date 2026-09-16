import type { NextFunction, Request, Response } from "express";
import type { IAutenticacion } from "../../modules/gestion-usuarios/sesion/interface/i-autenticacion.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";

export interface UsuarioAutenticado {
  id_usuario: string;
  roles: string[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioAutenticado;
    }
  }
}

export function requiereSesion(autenticacion: IAutenticacion) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Token no provisto");

    const token = header.slice("Bearer ".length);
    const { usuarioId, roles } = autenticacion.verificarToken(token);
    req.usuario = { id_usuario: usuarioId, roles };
    next();
  };
}

export function requiereRol(...rolesPermitidos: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) throw new UnauthorizedError();
    if (!req.usuario.roles.some((rol) => rolesPermitidos.includes(rol))) {
      throw new ForbiddenError();
    }
    next();
  };
}
