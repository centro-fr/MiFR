import { ConflictError, NotFoundError, UnauthorizedError } from "../../../shared/errors/app-error.js";
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
    if (input.dni && (await this.repositorio.buscarPorDni(input.dni))) {
      throw new ConflictError("Ya existe un usuario con ese dni");
    }

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

  buscarPorEmail(email: string): Promise<UsuarioConRoles | null> {
    return this.repositorio.buscarPorEmail(email);
  }

  buscarPorDni(dni: string): Promise<UsuarioConRoles | null> {
    return this.repositorio.buscarPorDni(dni);
  }

  listarPropietariasActivas(): Promise<UsuarioConRoles[]> {
    return this.repositorio.listarPropietariasActivas();
  }

  // Quien fue dado de alta con su email y sin google_id queda vinculado en su primer login. Una cuenta
  // ya vinculada no se reasigna a otra cuenta de Google con el mismo email: eso se lo quitaría a su dueña.
  async identificarPorGoogle(googleId: string, email: string): Promise<UsuarioConRoles | null> {
    const porGoogleId = await this.repositorio.buscarPorGoogleId(googleId);
    if (porGoogleId) return porGoogleId;

    const porEmail = await this.repositorio.buscarPorEmail(email);
    if (!porEmail) return null;

    const vinculado = await this.repositorio.vincularGoogleId(porEmail.id_usuario, googleId);
    if (!vinculado) throw new UnauthorizedError("La cuenta ya está vinculada a otra cuenta de Google");
    return vinculado;
  }

  async actualizar(id: number, input: ActualizarUsuarioInput): Promise<UsuarioConRoles> {
    const usuario = await this.obtenerPorId(id);
    if (input.estado === "INACTIVO") await this.verificarQueNoEsLaUltimaPropietaria(usuario);

    if (input.dni) {
      const existente = await this.repositorio.buscarPorDni(input.dni);
      if (existente && existente.id_usuario !== id)
        throw new ConflictError("Ya existe un usuario con ese dni");
    }

    return this.repositorio.actualizar(id, input);
  }

  async eliminar(id: number): Promise<void> {
    await this.verificarQueNoEsLaUltimaPropietaria(await this.obtenerPorId(id));
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
    if (rol === "PROPIETARIA") await this.verificarQueNoEsLaUltimaPropietaria(usuario);

    await this.autorizacion.quitarRol(id, rol);
    return this.obtenerPorId(id);
  }

  // Sin una propietaria activa nadie puede administrar la seguridad, y recuperarla exige tocar la base.
  private async verificarQueNoEsLaUltimaPropietaria(usuario: UsuarioConRoles): Promise<void> {
    if (usuario.estado !== "ACTIVO" || !this.autorizacion.tieneRol(usuario, "PROPIETARIA")) return;
    if ((await this.repositorio.contarPropietariasActivas()) <= 1) {
      throw new ConflictError("Es la única propietaria activa: primero hay que dar de alta otra");
    }
  }
}
