import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { IAutorizacion } from "./interface/i-autorizacion.js";
import type { PermisoRepository } from "./permiso.repository.js";
import type { CodigoRol, Rol, UsuarioConRoles } from "../usuario/user.types.js";

export class PermisoService implements IAutorizacion {
  constructor(private readonly repositorio: PermisoRepository) {}

  async asignarRol(idUsuario: number, codigo: CodigoRol): Promise<void> {
    const rol = await this.obtenerRol(codigo);
    await this.repositorio.asignarRol(idUsuario, rol.id_rol);
  }

  async quitarRol(idUsuario: number, codigo: CodigoRol): Promise<void> {
    const rol = await this.obtenerRol(codigo);
    await this.repositorio.quitarRol(idUsuario, rol.id_rol);
  }

  tieneRol(usuario: UsuarioConRoles, codigo: CodigoRol): boolean {
    return usuario.roles.some((usuarioRol) => usuarioRol.rol.codigo === codigo);
  }

  // Multi-rol: el usuario tiene el permiso si alguno de sus roles lo otorga (unión).
  async tienePermiso(usuario: UsuarioConRoles, codigoPermiso: string): Promise<boolean> {
    const idsRol = usuario.roles.map((usuarioRol) => usuarioRol.id_rol);
    if (idsRol.length === 0) return false;

    return (await this.repositorio.contarRolesConPermiso(idsRol, codigoPermiso)) > 0;
  }

  private async obtenerRol(codigo: CodigoRol): Promise<Rol> {
    const rol = await this.repositorio.buscarRolPorCodigo(codigo);
    if (!rol) throw new NotFoundError(`El rol ${codigo} no está cargado`);
    return rol;
  }
}
