import type { UsuarioConRoles } from "../../usuario/user.types.js";

export interface SesionPayload {
  usuarioId: string;
  roles: string[];
}

// Puerto provisto por el módulo (interfaz "IAutenticacion" en la vista arquitectónica):
// lo consumen tanto la capa de presentación (login) como el resto de los subsistemas
// (cada uno la requiere para validar sesión/permisos de sus propias rutas).
export interface IAutenticacion {
  iniciarSesion(idToken: string): Promise<{ token: string; usuario: UsuarioConRoles }>;
  verificarToken(token: string): SesionPayload;
}
