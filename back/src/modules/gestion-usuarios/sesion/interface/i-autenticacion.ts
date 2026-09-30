import type { UsuarioConRoles } from "../../usuario/user.types.js";

export interface SesionPayload {
  usuarioId: number;
  roles: string[];
}

// Perfil de quien tiene la sesión, con sus permisos efectivos para que el front
// arme el menú y los botones (usePermissions / <Can>).
export interface PerfilSesion {
  usuario: UsuarioConRoles;
  permisos: string[];
}

export interface SesionIniciada extends PerfilSesion {
  token: string;
}

// Puerto provisto por el módulo (interfaz "IAutenticacion" en la vista arquitectónica):
// lo consumen tanto la capa de presentación (login) como el resto de los subsistemas
// (cada uno la requiere para validar sesión/permisos de sus propias rutas).
export interface IAutenticacion {
  iniciarSesion(idToken: string): Promise<SesionIniciada>;
  obtenerPerfil(idUsuario: number): Promise<PerfilSesion>;
  verificarToken(token: string): SesionPayload;
}
