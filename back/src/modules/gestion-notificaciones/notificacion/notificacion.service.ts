import { NotFoundError } from "../../../shared/errors/app-error.js";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { IRegistroNotificaciones } from "./interface/i-registro-notificaciones.js";
import type { NotificacionRepository } from "./notificacion.repository.js";
import type { NotificacionPropia, NuevaNotificacion, PaginaNotificaciones } from "./notificacion.types.js";

// Componente Notificacion de la vista arquitectónica (GestionNotificaciones). Guarda los avisos que
// generan los procesos del subsistema y se los muestra a su destinatario, que es el único que los ve y
// los marca leídos. Son in-app: no hay envío que pueda fallar (arquitectura.md).
export class NotificacionService implements IRegistroNotificaciones {
  constructor(private readonly repositorio: NotificacionRepository) {}

  registrar(notificaciones: NuevaNotificacion[]): Promise<number> {
    return this.repositorio.registrar(notificaciones, new Date());
  }

  registrarResumenDiario(
    idUsuario: number,
    mensaje: string,
    ahora: Date,
    fechaDia: Date,
  ): Promise<boolean> {
    return this.repositorio.registrarResumenDiario(idUsuario, mensaje, ahora, fechaDia);
  }

  async listarDeUsuario(idUsuario: number, paginacion: Paginacion): Promise<PaginaNotificaciones> {
    return { ...(await this.repositorio.listarDeUsuario(idUsuario, paginacion)), ...paginacion };
  }

  // Una notificación de otra persona responde 404, igual que una que no existe (seguridad.md, regla 3).
  async marcarLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia> {
    const notificacion = await this.repositorio.marcarLeida(idNotificacion, idUsuario);
    if (!notificacion) throw new NotFoundError("Notificación no encontrada");
    return notificacion;
  }

  async marcarTodasLeidas(idUsuario: number): Promise<{ marcadas: number }> {
    return { marcadas: await this.repositorio.marcarTodasLeidas(idUsuario) };
  }
}
