import { prisma } from "../../../shared/db/client.js";
import type { IAutorizacion } from "./interface/i-autorizacion.js";
import type { Rol, UsuarioConRoles } from "../usuario/user.types.js";

export class PermisoService implements IAutorizacion {
  async asignarRol(idUsuario: string, rol: Rol): Promise<void> {
    await prisma.usuario_roles.create({ data: { id_usuario: idUsuario, rol } });
  }

  async quitarRol(idUsuario: string, rol: Rol): Promise<void> {
    await prisma.usuario_roles.delete({ where: { id_usuario_rol: { id_usuario: idUsuario, rol } } });
  }

  tienePermiso(usuario: UsuarioConRoles, rol: Rol): boolean {
    return usuario.roles.some((usuarioRol) => usuarioRol.rol === rol);
  }
}
