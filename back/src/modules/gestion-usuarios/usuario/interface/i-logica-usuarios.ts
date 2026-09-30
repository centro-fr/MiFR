import type { ActualizarUsuarioInput, CrearUsuarioInput } from "../user.schemas.js";
import type { CodigoRol, UsuarioConRoles } from "../user.types.js";

// Componente "Usuario": CRUD + asignación de roles. La decisión de permisos
// (componente "Permiso") es una dependencia externa, no vive acá.
export interface ILogicaUsuarios {
  crear(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  listar(): Promise<UsuarioConRoles[]>;
  obtenerPorId(id: number): Promise<UsuarioConRoles>;
  actualizar(id: number, input: ActualizarUsuarioInput): Promise<UsuarioConRoles>;
  eliminar(id: number): Promise<void>;
  asignarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles>;
  quitarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles>;
}
