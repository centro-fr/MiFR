import type { CodigoRol, UsuarioConRoles } from "../../usuario/user.types.js";

// Componente "Permiso": dueño de los roles de un usuario y de decidir si puede algo.
// Roles y permisos según el DER: usuario_roles -> roles -> rol_permisos -> permisos.
export interface IAutorizacion {
  asignarRol(idUsuario: number, codigo: CodigoRol): Promise<void>;
  quitarRol(idUsuario: number, codigo: CodigoRol): Promise<void>;
  tieneRol(usuario: UsuarioConRoles, codigo: CodigoRol): boolean;
  tienePermiso(usuario: UsuarioConRoles, codigoPermiso: string): Promise<boolean>;
}
