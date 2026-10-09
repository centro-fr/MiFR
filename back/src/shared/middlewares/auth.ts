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

// Express 5 pasa al errorHandler tanto lo que se lanza como el rechazo de un middleware async,
// así que los guardias lanzan el AppError directamente.

export function requiereSesion(autenticacion: IAutenticacion) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw new UnauthorizedError("Token no provisto");

    const { usuarioId, roles } = await autenticacion.validarSesion(header.slice("Bearer ".length));
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

// Decide con los roles actuales de la base, no con los del JWT: así un cambio en la
// matriz o en los roles del usuario rige desde la próxima petición.
export function requierePermiso(autorizacion: IAutorizacion, codigoPermiso: CodigoPermiso) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.usuario) throw new UnauthorizedError();
    if (!(await autorizacion.tienePermiso(req.usuario.id_usuario, codigoPermiso))) {
      throw new ForbiddenError();
    }
    next();
  };
}

// Cada usuario puede ver y editar sus propios datos; para los de otro hace falta el permiso.
// Va después de validar los params, así req.params.id ya es un número.
export function requierePropioOPermiso(autorizacion: IAutorizacion, codigoPermiso: CodigoPermiso) {
  const verificarPermiso = requierePermiso(autorizacion, codigoPermiso);

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.usuario) throw new UnauthorizedError();
    if (Number(req.params.id) === req.usuario.id_usuario) return next();
    await verificarPermiso(req, res, next);
  };
}

// Un guardia async devuelve la promesa para que quien lo envuelva pueda esperarlo.
export type Guardia = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface ControlDeAcceso {
  sesion: Guardia;
  rol(...rolesPermitidos: string[]): Guardia;
  permiso(codigoPermiso: CodigoPermiso): Guardia;
  propioOPermiso(codigoPermiso: CodigoPermiso): Guardia;
}

// Junta los guardias con autenticación y autorización ya resueltas, para que las rutas digan
// qué exigen (acceso.permiso("PLANES_VER")) sin recibir ni pasar esas dos dependencias.
export function crearControlDeAcceso(
  autenticacion: IAutenticacion,
  autorizacion: IAutorizacion,
): ControlDeAcceso {
  return {
    sesion: requiereSesion(autenticacion),
    rol: requiereRol,
    permiso: (codigoPermiso) => requierePermiso(autorizacion, codigoPermiso),
    propioOPermiso: (codigoPermiso) => requierePropioOPermiso(autorizacion, codigoPermiso),
  };
}
