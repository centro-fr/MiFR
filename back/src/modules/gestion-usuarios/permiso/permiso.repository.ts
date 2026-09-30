import { prisma } from "../../../shared/db/client.js";
import type { CodigoRol, Rol } from "../usuario/user.types.js";

export class PermisoRepository {
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

  // Cuántos de esos roles otorgan el permiso (rol_permisos -> permisos).
  contarRolesConPermiso(idsRol: number[], codigoPermiso: string): Promise<number> {
    return prisma.rol_permisos.count({
      where: { id_rol: { in: idsRol }, permiso: { codigo: codigoPermiso } },
    });
  }
}
