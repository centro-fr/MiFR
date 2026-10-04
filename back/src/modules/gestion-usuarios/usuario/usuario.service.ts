import { ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { UsuarioRepository } from "./usuario.repository.js";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "./usuario.schemas.js";
import type { CodigoRol, UsuarioConRoles } from "./usuario.types.js";
import type { IInfoUsuarios } from "./interface/i-info-usuarios.js";

// Componente "Usuario": alta, baja, modificación y roles de los usuarios. La presentación
// llega a él por ILogicaUsuarios (GestionUsuariosService), no directamente.
export class UsuarioService implements IInfoUsuarios {
  constructor(
    private readonly repositorio: UsuarioRepository,
    private readonly autorizacion: IAutorizacion,
  ) {}

  async crear(input: CrearUsuarioInput): Promise<UsuarioConRoles> {
    const existente = await this.repositorio.buscarPorEmailOGoogleId(input.email, input.google_id);
    if (existente) throw new ConflictError("Ya existe un usuario con ese email o google_id");

    return this.repositorio.crear(input);
  }

  listar(): Promise<UsuarioConRoles[]> {
    return this.repositorio.listar();
  }

  async obtenerPorId(id: number): Promise<UsuarioConRoles> {
    const usuario = await this.buscarPorId(id);
    if (!usuario) throw new NotFoundError("Usuario no encontrado");
    return usuario;
  }

  buscarPorId(id: number): Promise<UsuarioConRoles | null> {
    return this.repositorio.buscarPorId(id);
  }

  // Quien fue dado de alta con su email y sin google_id queda vinculado en su primer login.
  async identificarPorGoogle(googleId: string, email: string): Promise<UsuarioConRoles | null> {
    const porGoogleId = await this.repositorio.buscarPorGoogleId(googleId);
    if (porGoogleId) return porGoogleId;

    const porEmail = await this.repositorio.buscarPorEmail(email);
    return porEmail ? this.repositorio.vincularGoogleId(porEmail.id_usuario, googleId) : null;
  }

  async actualizar(id: number, input: ActualizarUsuarioInput): Promise<UsuarioConRoles> {
    await this.obtenerPorId(id);

    if (input.dni) {
      const existente = await this.repositorio.buscarPorDni(input.dni);
      if (existente && existente.id_usuario !== id)
        throw new ConflictError("Ya existe un usuario con ese dni");
    }

    return this.repositorio.actualizar(id, input);
  }

  async eliminar(id: number): Promise<void> {
    await this.obtenerPorId(id);
    if (!(await this.repositorio.eliminar(id))) {
      throw new ConflictError(
        "El usuario tiene registros asociados y no se puede eliminar; para darlo de baja, cambiá su estado a INACTIVO",
      );
    }
  }

  async asignarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles> {
    const usuario = await this.obtenerPorId(id);
    if (this.autorizacion.tieneRol(usuario, rol)) {
      throw new ConflictError("El usuario ya tiene ese rol asignado");
    }

    await this.autorizacion.asignarRol(id, rol);
    return this.obtenerPorId(id);
  }

  async quitarRol(id: number, rol: CodigoRol): Promise<UsuarioConRoles> {
    const usuario = await this.obtenerPorId(id);
    if (!this.autorizacion.tieneRol(usuario, rol)) {
      throw new NotFoundError("El usuario no tiene ese rol asignado");
    }

    await this.autorizacion.quitarRol(id, rol);
    return this.obtenerPorId(id);
  }
}
