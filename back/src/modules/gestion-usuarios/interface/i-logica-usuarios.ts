import type { CambioPermiso } from "../rol/rol.schemas.js";
import type { MatrizPermisos } from "../rol/rol.types.js";
import type { PerfilSesion, SesionIniciada } from "../sesion/interface/i-autenticacion.js";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "../usuario/usuario.schemas.js";
import type { CodigoRol, UsuarioConRoles } from "../usuario/usuario.types.js";

// Interfaz del subsistema GestionUsuarios en la vista arquitectónica: es lo único que ve la
// capa de presentación (UsuarioPresWeb). Reúne lo que ofrecen sus componentes Sesion,
// Usuario y Rol; IAutenticacion e IAutorizacion quedan para los otros subsistemas.
export interface ILogicaUsuarios {
  iniciarSesion(idToken: string): Promise<SesionIniciada>;
  obtenerPerfil(idUsuario: number): Promise<PerfilSesion>;

  crear(input: CrearUsuarioInput): Promise<UsuarioConRoles>;
  listar(): Promise<UsuarioConRoles[]>;
  obtenerPorId(id: number): Promise<UsuarioConRoles>;
  actualizar(id: number, input: ActualizarUsuarioInput): Promise<UsuarioConRoles>;
  eliminar(id: number): Promise<void>;
  asignarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles>;
  quitarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles>;

  obtenerMatriz(): Promise<MatrizPermisos>;
  actualizarMatriz(cambios: CambioPermiso[]): Promise<void>;
}
