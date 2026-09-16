import { prisma } from "../../../shared/db/client.js";
import type { CrearUsuarioInput } from "./user.schemas.js";
import type { UsuarioConRoles } from "./user.types.js";

const CON_ROLES = { include: { roles: true } } as const;

export class UsuarioRepository {
  buscarPorId(id: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { id_usuario: id }, ...CON_ROLES });
  }

  buscarPorGoogleId(googleId: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { google_id: googleId }, ...CON_ROLES });
  }

  buscarPorEmail(email: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findUnique({ where: { email }, ...CON_ROLES });
  }

  buscarPorEmailOGoogleId(email: string, googleId?: string): Promise<UsuarioConRoles | null> {
    return prisma.usuarios.findFirst({
      where: { OR: [{ email }, ...(googleId ? [{ google_id: googleId }] : [])] },
      ...CON_ROLES,
    });
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

  actualizar(id: string, data: Record<string, unknown>): Promise<UsuarioConRoles> {
    return prisma.usuarios.update({ where: { id_usuario: id }, data, ...CON_ROLES });
  }

  vincularGoogleId(id: string, googleId: string): Promise<UsuarioConRoles> {
    return prisma.usuarios.update({ where: { id_usuario: id }, data: { google_id: googleId }, ...CON_ROLES });
  }

  eliminar(id: string): Promise<UsuarioConRoles> {
    return prisma.usuarios.delete({ where: { id_usuario: id }, ...CON_ROLES });
  }
}
