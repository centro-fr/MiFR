import type { Rol, UsuarioConRoles } from "../../usuario/user.types.js";

// Componente "Permiso": dueño de los roles de un usuario y de decidir si puede algo.
export interface IAutorizacion {
  asignarRol(idUsuario: string, rol: Rol): Promise<void>;
  quitarRol(idUsuario: string, rol: Rol): Promise<void>;
  tienePermiso(usuario: UsuarioConRoles, rol: Rol): boolean;
}
