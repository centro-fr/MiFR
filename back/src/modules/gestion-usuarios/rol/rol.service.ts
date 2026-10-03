import {
  NotFoundError,
  PermisoCriticoInmutableError,
  PermisoExclusivoPropietariaError,
} from "../../../shared/errors/app-error.js";
import type { IAutorizacion } from "./interface/i-autorizacion.js";
import { esPermisoCritico, esPermisoExclusivoPropietaria } from "./rol.catalogo.js";
import type { RolRepository } from "./rol.repository.js";
import type { CambioPermiso } from "./rol.schemas.js";
import type { ClavePermisoRol, MatrizPermisos, PermisoDeMatriz } from "./rol.types.js";
import type { CodigoRol, Rol, UsuarioConRoles } from "../usuario/user.types.js";

export class RolService implements IAutorizacion {
  constructor(private readonly repositorio: RolRepository) {}

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
  // Se consulta la base en cada petición para que un cambio de la matriz rija enseguida.
  async tienePermiso(idUsuario: number, codigoPermiso: string): Promise<boolean> {
    return (await this.repositorio.contarRolesDeUsuarioConPermiso(idUsuario, codigoPermiso)) > 0;
  }

  permisosEfectivos(idUsuario: number): Promise<string[]> {
    return this.repositorio.listarCodigosPermisoDeUsuario(idUsuario);
  }

  async obtenerMatriz(): Promise<MatrizPermisos> {
    const [roles, permisos, asignaciones] = await Promise.all([
      this.repositorio.listarRoles(),
      this.repositorio.listarPermisos(),
      this.repositorio.listarAsignaciones(),
    ]);

    const modulos = new Map<string, PermisoDeMatriz[]>();
    for (const { id_permiso, codigo, modulo, descripcion } of permisos) {
      const delModulo = modulos.get(modulo) ?? [];
      delModulo.push({ id_permiso, codigo, descripcion, critico: esPermisoCritico(codigo) });
      modulos.set(modulo, delModulo);
    }

    const matriz: Record<string, string[]> = Object.fromEntries(roles.map((rol) => [rol.codigo, []]));
    for (const { rol, permiso } of asignaciones) matriz[rol.codigo]?.push(permiso.codigo);

    return {
      roles: roles.map(({ id_rol, codigo, nombre }) => ({ id_rol, codigo, nombre })),
      modulos: [...modulos].map(([modulo, permisosDelModulo]) => ({ modulo, permisos: permisosDelModulo })),
      matriz,
    };
  }

  // Se valida todo el lote antes de escribir: o se aplican todos los cambios o ninguno.
  async actualizarMatriz(cambios: CambioPermiso[]): Promise<void> {
    const [roles, permisos] = await Promise.all([
      this.repositorio.listarRoles(),
      this.repositorio.listarPermisos(),
    ]);
    const idRol = new Map(roles.map((rol) => [rol.codigo as string, rol.id_rol]));
    const idPermiso = new Map(permisos.map((permiso) => [permiso.codigo, permiso.id_permiso]));

    const otorgar: ClavePermisoRol[] = [];
    const quitar: ClavePermisoRol[] = [];

    for (const { rol, permiso, otorgado } of cambios) {
      const id_rol = idRol.get(rol);
      if (id_rol === undefined) throw new NotFoundError(`El rol ${rol} no está cargado`);
      const id_permiso = idPermiso.get(permiso);
      if (id_permiso === undefined) throw new NotFoundError(`El permiso ${permiso} no existe`);

      if (rol === "PROPIETARIA" && !otorgado && esPermisoCritico(permiso)) {
        throw new PermisoCriticoInmutableError(permiso);
      }
      if (rol !== "PROPIETARIA" && otorgado && esPermisoExclusivoPropietaria(permiso)) {
        throw new PermisoExclusivoPropietariaError(permiso);
      }

      (otorgado ? otorgar : quitar).push({ id_rol, id_permiso });
    }

    await this.repositorio.aplicarCambios(otorgar, quitar);
  }

  private async obtenerRol(codigo: CodigoRol): Promise<Rol> {
    const rol = await this.repositorio.buscarRolPorCodigo(codigo);
    if (!rol) throw new NotFoundError(`El rol ${codigo} no está cargado`);
    return rol;
  }
}
