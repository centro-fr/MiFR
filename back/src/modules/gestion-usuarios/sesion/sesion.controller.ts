import type { Request, Response } from "express";
import type { ILogicaUsuarios } from "../interface/i-logica-usuarios.js";
import type { PerfilSesion } from "./interface/i-autenticacion.js";
import type { UsuarioRol } from "../usuario/usuario.types.js";

function respuestaPerfil({ usuario, permisos }: PerfilSesion) {
  return { usuario, roles: usuario.roles.map((r: UsuarioRol) => r.rol.codigo), permisos };
}

export function createSesionController(gestionUsuarios: ILogicaUsuarios) {
  return {
    async googleLogin(req: Request, res: Response): Promise<void> {
      const { token, ...perfil } = await gestionUsuarios.iniciarSesion(req.body.id_token);
      res.status(200).json({ token, ...respuestaPerfil(perfil) });
    },

    async loginDesarrollo(req: Request, res: Response): Promise<void> {
      const { token, ...perfil } = await gestionUsuarios.iniciarSesionDesarrollo(req.body.email);
      res.status(200).json({ token, ...respuestaPerfil(perfil) });
    },

    async me(req: Request, res: Response): Promise<void> {
      const perfil = await gestionUsuarios.obtenerPerfil(req.usuario!.id_usuario);
      res.status(200).json(respuestaPerfil(perfil));
    },

    // El JWT no tiene estado en el servidor: cerrar sesión es que el front lo descarte.
    // El endpoint queda para cuando el token pase a una cookie httpOnly que haya que borrar.
    async logout(_req: Request, res: Response): Promise<void> {
      res.status(200).json({ mensaje: "Sesión cerrada correctamente" });
    },
  };
}
