import type { PrismaClient } from "@prisma/client";
import { clienteEnCurso } from "../../../shared/db/transaccion.js";
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
  // que ya estaba, también si dos procesos corren a la vez. Devuelve solo las que insertó: el push sale
  // de esas, así un aviso repetido no vuelve a llegar al celular.
  async registrar(notificaciones: NuevaNotificacion[], ahora: Date): Promise<NuevaNotificacion[]> {
    if (notificaciones.length === 0) return [];
    return clienteEnCurso(this.prisma).notificaciones.createManyAndReturn({
      data: notificaciones.map((notificacion) => ({
        ...notificacion,
        fecha_generacion: ahora,
        fecha_envio: ahora,
        estado_envio: "ENVIADA",
        leida: false,
      })),
      skipDuplicates: true,
      select: { id_usuario: true, tipo: true, id_cuota: true, mensaje: true },
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
