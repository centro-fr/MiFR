import type { PrismaClient } from "@prisma/client";
import { clienteEnCurso, enTransaccion } from "../../../shared/db/transaccion.js";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { NotificacionPropia, NuevaNotificacion } from "./notificacion.types.js";

const SELECCION_PROPIA = {
  id_notificacion: true,
  tipo: true,
  id_cuota: true,
  mensaje: true,
  fecha_generacion: true,
  leida: true,
} as const;

export class NotificacionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // skipDuplicates es ON CONFLICT DO NOTHING: el único (id_usuario, id_cuota, tipo) descarta el aviso
  // que ya estaba, también si dos procesos corren a la vez.
  async registrar(notificaciones: NuevaNotificacion[], ahora: Date): Promise<number> {
    if (notificaciones.length === 0) return 0;
    const { count } = await clienteEnCurso(this.prisma).notificaciones.createMany({
      data: notificaciones.map((notificacion) => ({
        ...notificacion,
        fecha_generacion: ahora,
        fecha_envio: ahora,
        estado_envio: "ENVIADA",
        leida: false,
      })),
      skipDuplicates: true,
    });
    return count;
  }

  // US-26: El resumen diario no tiene cuota, así que su "uno por día" se controla dentro del bloqueo
  // en que se inserta (seguridad.md, regla 7; arquitectura.md). Devuelve true si se insertó, false si ya existía.
  async registrarResumenDiario(
    idUsuario: number,
    mensaje: string,
    ahora: Date,
    fechaDia: Date,
  ): Promise<boolean> {
    const finDia = new Date(fechaDia.getTime() + 24 * 60 * 60_000);
    const clave = `resumen-diario:${idUsuario}:${fechaDia.toISOString().slice(0, 10)}`;

    return enTransaccion(this.prisma, async (transaccion) => {
      await transaccion.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${clave}, 0))`;
      const count = await transaccion.notificaciones.count({
        where: {
          id_usuario: idUsuario,
          tipo: "RESUMEN_DIARIO",
          fecha_generacion: {
            gte: fechaDia,
            lt: finDia,
          },
        },
      });
      if (count > 0) return false;

      await transaccion.notificaciones.create({
        data: {
          id_usuario: idUsuario,
          tipo: "RESUMEN_DIARIO",
          id_cuota: null,
          mensaje,
          fecha_generacion: ahora,
          fecha_envio: ahora,
          estado_envio: "ENVIADA",
          leida: false,
        },
      });
      return true;
    });
  }

  // Las no leídas primero y, dentro de cada grupo, de la más nueva a la más vieja.
  async listarDeUsuario(
    idUsuario: number,
    { limit, offset }: Paginacion,
  ): Promise<{ datos: NotificacionPropia[]; total: number; no_leidas: number }> {
    const [datos, total, no_leidas] = await Promise.all([
      this.prisma.notificaciones.findMany({
        where: { id_usuario: idUsuario },
        select: SELECCION_PROPIA,
        orderBy: [{ leida: "asc" }, { fecha_generacion: "desc" }, { id_notificacion: "desc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.notificaciones.count({ where: { id_usuario: idUsuario } }),
      this.prisma.notificaciones.count({ where: { id_usuario: idUsuario, leida: false } }),
    ]);
    return { datos, total, no_leidas };
  }

  // Filtra también por el destinatario: una notificación ajena no se marca, igual que una que no existe.
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia | null> {
    const { count } = await this.prisma.notificaciones.updateMany({
      where: { id_notificacion: idNotificacion, id_usuario: idUsuario },
      data: { leida: true },
    });
    if (count === 0) return null;
    return this.prisma.notificaciones.findUnique({
      where: { id_notificacion: idNotificacion },
      select: SELECCION_PROPIA,
    });
  }

  async marcarTodasLeidas(idUsuario: number): Promise<number> {
    const { count } = await this.prisma.notificaciones.updateMany({
      where: { id_usuario: idUsuario, leida: false },
      data: { leida: true },
    });
    return count;
  }
}
