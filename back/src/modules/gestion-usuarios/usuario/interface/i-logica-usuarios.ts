import type { ActualizarUsuarioInput, CrearUsuarioInput } from "../user.schemas.js";
import type { Rol, UsuarioConRoles } from "../user.types.js";

// Componente "Usuario": CRUD + asignación de roles. La decisión de permisos
// (componente "Permiso") es una dependencia externa, no vive acá.
export interface ILogicaUsuarios {
  crear(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  listar(): Promise<UsuarioConRoles[]>;
  obtenerPorId(id: string): Promise<UsuarioConRoles>;
  actualizar(id: string, input: ActualizarUsuarioInput): Promise<UsuarioConRoles>;
  eliminar(id: string): Promise<void>;
  asignarRol(id: string, rol: Rol): Promise<UsuarioConRoles>;
  quitarRol(id: string, rol: Rol): Promise<UsuarioConRoles>;
}
