import { prisma } from "../../../shared/db/client.js";
import type { CodigoRol, Rol } from "../usuario/usuario.types.js";
import type { AsignacionPermiso, ClavePermisoRol, Permiso } from "./rol.types.js";

export class RolRepository {
  buscarRolPorCodigo(codigo: CodigoRol): Promise<Rol | null> {
    return prisma.roles.findUnique({ where: { codigo } });
  }

  async asignarRol(idUsuario: number, idRol: number): Promise<void> {
    await prisma.usuario_roles.create({ data: { id_usuario: idUsuario, id_rol: idRol } });
  }

  async quitarRol(idUsuario: number, idRol: number): Promise<void> {
    await prisma.usuario_roles.delete({
      where: { id_usuario_id_rol: { id_usuario: idUsuario, id_rol: idRol } },
    });
  }

  // Cuántos de los roles actuales del usuario otorgan el permiso (usuario_roles -> rol_permisos).
  contarRolesDeUsuarioConPermiso(idUsuario: number, codigoPermiso: string): Promise<number> {
    return prisma.rol_permisos.count({
      where: { permiso: { codigo: codigoPermiso }, rol: { usuarios: { some: { id_usuario: idUsuario } } } },
    });
  }

  // Cada permiso aparece una sola vez aunque lo otorguen varios roles del usuario.
  async listarCodigosPermisoDeUsuario(idUsuario: number): Promise<string[]> {
    const permisos = await prisma.permisos.findMany({
      where: { roles: { some: { rol: { usuarios: { some: { id_usuario: idUsuario } } } } } },
      select: { codigo: true },
      orderBy: { codigo: "asc" },
    });
    return permisos.map((permiso) => permiso.codigo);
  }

  listarRoles(): Promise<Rol[]> {
    return prisma.roles.findMany({ orderBy: { id_rol: "asc" } });
  }

  listarPermisos(): Promise<Permiso[]> {
    return prisma.permisos.findMany({ orderBy: [{ modulo: "asc" }, { codigo: "asc" }] });
  }

  listarAsignaciones(): Promise<AsignacionPermiso[]> {
    return prisma.rol_permisos.findMany({
      select: { rol: { select: { codigo: true } }, permiso: { select: { codigo: true } } },
    });
  }

  // Otorgar es insertar la fila de rol_permisos y quitar es borrarla (el DER no tiene "permitido").
  async aplicarCambios(otorgar: ClavePermisoRol[], quitar: ClavePermisoRol[]): Promise<void> {
    await prisma.$transaction([
      ...(otorgar.length > 0
        ? [prisma.rol_permisos.createMany({ data: otorgar, skipDuplicates: true })]
        : []),
      ...(quitar.length > 0 ? [prisma.rol_permisos.deleteMany({ where: { OR: quitar } })] : []),
    ]);
  }
}
