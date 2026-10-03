import { prisma } from "../../../shared/db/client.js";
import type { CrearUsuarioInput } from "./usuario.schemas.js";
import type { UsuarioConRoles } from "./usuario.types.js";

const CON_ROLES = { include: { roles: { include: { rol: true } } } } as const;

export class UsuarioRepository {
  buscarPorId(id: number): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { id_usuario: id }, ...CON_ROLES });
  }

  buscarPorGoogleId(googleId: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { google_id: googleId }, ...CON_ROLES });
  }

  buscarPorEmail(email: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { email }, ...CON_ROLES });
  }

  async buscarPorEmailOGoogleId(email?: string, googleId?: string): Promise<UsuarioConRoles | null> {
    const condiciones = [...(email ? [{ email }] : []), ...(googleId ? [{ google_id: googleId }] : [])];
    if (condiciones.length === 0) return null;

    return prisma.usuarios.findFirst({ where: { OR: condiciones }, ...CON_ROLES });
  }

  buscarPorDni(dni: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { dni }, ...CON_ROLES });
  }

  listar(): Promise<UsuarioConRoles[]> {
    return prisma.usuarios.findMany({ orderBy: { fecha_alta: "desc" }, ...CON_ROLES });
  }

  crear(data: CrearUsuarioInput): Promise<UsuarioConRoles> {
    return prisma.usuarios.create({ data, ...CON_ROLES });
  }

  actualizar(id: number, data: Record<string, unknown>): Promise<UsuarioConRoles> {
    return prisma.usuarios.update({ where: { id_usuario: id }, data, ...CON_ROLES });
  }

  vincularGoogleId(id: number, googleId: string): Promise<UsuarioConRoles> {
    return prisma.usuarios.update({ where: { id_usuario: id }, data: { google_id: googleId }, ...CON_ROLES });
  }

  // La FK de usuario_roles es ON DELETE NO ACTION (DER): primero se quitan sus roles.
  async eliminar(id: number): Promise<void> {
    await prisma.$transaction([
      prisma.usuario_roles.deleteMany({ where: { id_usuario: id } }),
      prisma.usuarios.delete({ where: { id_usuario: id } }),
    ]);
  }
}
