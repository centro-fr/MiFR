import { Prisma, type PrismaClient } from "@prisma/client";
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

  // Solo vincula si la cuenta todavía no tiene google_id: la condición va en el UPDATE para que dos
  // logins simultáneos con cuentas de Google distintas no se pisen. Devuelve null si ya estaba vinculada.
  async vincularGoogleId(id: number, googleId: string): Promise<UsuarioConRoles | null> {
    const { count } = await this.prisma.usuarios.updateMany({
      where: { id_usuario: id, google_id: null },
      data: { google_id: googleId },
    });
    return count === 0 ? null : this.buscarPorId(id);
  }

  contarPropietariasActivas(): Promise<number> {
    return this.prisma.usuarios.count({
      where: { estado: "ACTIVO", roles: { some: { rol: { codigo: "PROPIETARIA" } } } },
    });
  }

  // La FK de usuario_roles es ON DELETE NO ACTION (DER): primero se quitan sus roles.
  // Devuelve false si otra tabla (profesoras, y más adelante alumnos o pagos) todavía apunta al
  // usuario: las FK son NO ACTION y Postgres rechaza el borrado con el código P2003 de Prisma.
  async eliminar(id: number): Promise<boolean> {
    try {
      await this.prisma.$transaction([
        this.prisma.usuario_roles.deleteMany({ where: { id_usuario: id } }),
        this.prisma.usuarios.delete({ where: { id_usuario: id } }),
      ]);
      return true;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") return false;
      throw error;
    }
  }
}
