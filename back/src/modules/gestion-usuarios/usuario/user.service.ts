import { ConflictError, NotFoundError } from "../../../shared/errors/app-error.js";
import type { IAutorizacion } from "../rol/interface/i-autorizacion.js";
import type { UsuarioRepository } from "./user.repository.js";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "./user.schemas.js";
import type { CodigoRol, UsuarioConRoles } from "./user.types.js";

// Componente "Usuario": alta, baja, modificación y roles de los usuarios. La presentación
// llega a él por ILogicaUsuarios (GestionUsuariosService), no directamente.
export class UsuarioService {
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
    const usuario = await this.repositorio.buscarPorId(id);
    if (!usuario) throw new NotFoundError("Usuario no encontrado");
    return usuario;
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
    await this.repositorio.eliminar(id);
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
