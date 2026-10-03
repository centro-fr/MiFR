import type { PrismaClient } from "@prisma/client";
import type { CrearUsuarioInput } from "./usuario.schemas.js";
import type { UsuarioConRoles } from "./usuario.types.js";

const CON_ROLES = { include: { roles: { include: { rol: true } } } } as const;

export class UsuarioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  buscarPorId(id: number): Promise<UsuarioConRoles | null> {
    return this.prisma.usuarios.findUnique({ where: { id_usuario: id }, ...CON_ROLES });
  }

  buscarPorGoogleId(googleId: string): Promise<UsuarioConRoles | null> {
    return this.prisma.usuarios.findUnique({ where: { google_id: googleId }, ...CON_ROLES });
  }

  buscarPorEmail(email: string): Promise<UsuarioConRoles | null> {
    return this.prisma.usuarios.findUnique({ where: { email }, ...CON_ROLES });
  }

  async buscarPorEmailOGoogleId(email?: string, googleId?: string): Promise<UsuarioConRoles | null> {
    const condiciones = [...(email ? [{ email }] : []), ...(googleId ? [{ google_id: googleId }] : [])];
    if (condiciones.length === 0) return null;

    return this.prisma.usuarios.findFirst({ where: { OR: condiciones }, ...CON_ROLES });
  }

  buscarPorDni(dni: string): Promise<UsuarioConRoles | null> {
    return this.prisma.usuarios.findUnique({ where: { dni }, ...CON_ROLES });
  }

  listar(): Promise<UsuarioConRoles[]> {
    return this.prisma.usuarios.findMany({ orderBy: { fecha_alta: "desc" }, ...CON_ROLES });
  }

  crear(data: CrearUsuarioInput): Promise<UsuarioConRoles> {
    return this.prisma.usuarios.create({ data, ...CON_ROLES });
  }

  actualizar(id: number, data: Record<string, unknown>): Promise<UsuarioConRoles> {
    return this.prisma.usuarios.update({ where: { id_usuario: id }, data, ...CON_ROLES });
  }

  vincularGoogleId(id: number, googleId: string): Promise<UsuarioConRoles> {
    return this.prisma.usuarios.update({
      where: { id_usuario: id },
      data: { google_id: googleId },
      ...CON_ROLES,
    });
  }

  // La FK de usuario_roles es ON DELETE NO ACTION (DER): primero se quitan sus roles.
  async eliminar(id: number): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.usuario_roles.deleteMany({ where: { id_usuario: id } }),
      this.prisma.usuarios.delete({ where: { id_usuario: id } }),
    ]);
  }
}
