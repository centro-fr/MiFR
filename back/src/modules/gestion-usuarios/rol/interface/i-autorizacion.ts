import type { CodigoRol, UsuarioConRoles } from "../../usuario/user.types.js";
import type { CambioPermiso } from "../rol.schemas.js";
import type { MatrizPermisos } from "../rol.types.js";

// Componente "Rol" de la vista arquitectónica: dueño de los roles de un
// usuario, de decidir si puede algo y de la matriz rol × permiso que administra la propietaria.
// Roles y permisos según el DER: usuario_roles -> roles -> rol_permisos -> permisos.
export interface IAutorizacion {
  asignarRol(idUsuario: number, codigo: CodigoRol): Promise<void>;
  quitarRol(idUsuario: number, codigo: CodigoRol): Promise<void>;
  tieneRol(usuario: UsuarioConRoles, codigo: CodigoRol): boolean;
  tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean>;
  permisosEfectivos(idUsuario: number): Promise<string[]>;
  obtenerMatriz(): Promise<MatrizPermisos>;
  actualizarMatriz(cambios: CambioPermiso[]): Promise<void>;
}
