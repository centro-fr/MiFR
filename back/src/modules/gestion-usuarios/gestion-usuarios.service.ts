import type { ILogicaUsuarios } from "./interface/i-logica-usuarios.js";
import type { IAutorizacion } from "./rol/interface/i-autorizacion.js";
import type { CambioPermiso } from "./rol/rol.schemas.js";
import type { MatrizPermisos } from "./rol/rol.types.js";
import type { IAutenticacion, PerfilSesion, SesionIniciada } from "./sesion/interface/i-autenticacion.js";
import type { UsuarioService } from "./usuario/usuario.service.js";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "./usuario/usuario.schemas.js";
import type { CodigoRol, UsuarioConRoles } from "./usuario/usuario.types.js";

// Realiza ILogicaUsuarios, que en el diagrama la provee el subsistema y no un componente:
// pasa cada operación al componente dueño (Sesion, Usuario o Rol) y no agrega reglas propias.
export class GestionUsuariosService implements ILogicaUsuarios {
  constructor(
    private readonly usuarios: UsuarioService,
    private readonly sesion: IAutenticacion,
    private readonly autorizacion: IAutorizacion,
  ) {}

  iniciarSesion(idToken: string): Promise<SesionIniciada> {
    return this.sesion.iniciarSesion(idToken);
  }

  iniciarSesionDesarrollo(email: string): Promise<SesionIniciada> {
    return this.sesion.iniciarSesionDesarrollo(email);
  }

  obtenerPerfil(idUsuario: number): Promise<PerfilSesion> {
    return this.sesion.obtenerPerfil(idUsuario);
  }

  crearUsuario(input: CrearUsuarioInput): Promise<UsuarioConRoles> {
    return this.usuarios.crear(input);
  }

  listarUsuarios(): Promise<UsuarioConRoles[]> {
    return this.usuarios.listar();
  }

  obtenerUsuarioPorId(id: number): Promise<UsuarioConRoles> {
    return this.usuarios.obtenerPorId(id);
  }

  actualizarUsuario(id: number, input: ActualizarUsuarioInput): Promise<UsuarioConRoles> {
    return this.usuarios.actualizar(id, input);
  }

  eliminarUsuario(id: number): Promise<void> {
    return this.usuarios.eliminar(id);
  }

  asignarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles> {
    return this.usuarios.asignarRol(id, rol);
  }

  quitarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles> {
    return this.usuarios.quitarRol(id, rol);
  }

  obtenerMatriz(): Promise<MatrizPermisos> {
    return this.autorizacion.obtenerMatriz();
  }

  actualizarMatriz(cambios: CambioPermiso[]): Promise<void> {
    return this.autorizacion.actualizarMatriz(cambios);
  }
}
