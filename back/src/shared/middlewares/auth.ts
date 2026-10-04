import type { NextFunction, Request, Response } from "express";
import type { IAutorizacion } from "../../modules/gestion-usuarios/rol/interface/i-autorizacion.js";
import type { CodigoPermiso } from "../../modules/gestion-usuarios/rol/rol.catalogo.js";
import type { IAutenticacion } from "../../modules/gestion-usuarios/sesion/interface/i-autenticacion.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";

export interface UsuarioAutenticado {
  id_usuario: number;
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
    autenticacion
      .validarSesion(token)
      .then(({ usuarioId, roles }) => {
        req.usuario = { id_usuario: usuarioId, roles };
        next();
      })
      .catch(next);
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

// Decide con los roles actuales de la base, no con los del JWT: así un cambio en la
// matriz o en los roles del usuario rige desde la próxima petición.
export function requierePermiso(autorizacion: IAutorizacion, codigoPermiso: CodigoPermiso) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.usuario) throw new UnauthorizedError();

    autorizacion
      .tienePermiso(req.usuario.id_usuario, codigoPermiso)
      .then((permitido) => next(permitido ? undefined : new ForbiddenError()))
      .catch(next);
  };
}

// Cada usuario puede ver y editar sus propios datos; para los de otro hace falta el permiso.
// Va después de validar los params, así req.params.id ya es un número.
export function requierePropioOPermiso(autorizacion: IAutorizacion, codigoPermiso: CodigoPermiso) {
  const verificarPermiso = requierePermiso(autorizacion, codigoPermiso);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) throw new UnauthorizedError();
    if (Number(req.params.id) === req.usuario.id_usuario) return next();
    verificarPermiso(req, res, next);
  };
}
