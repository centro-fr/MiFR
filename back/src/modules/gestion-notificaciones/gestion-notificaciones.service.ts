import type { Paginacion } from "../../shared/utils/esquemas-paginacion.js";
import { registrarError } from "../../shared/utils/registro-errores.js";
import type { ILogicaNotificaciones } from "./interface/i-logica-notificaciones.js";
import type { NotificacionService } from "./notificacion/notificacion.service.js";
import type { NotificacionPropia, PaginaNotificaciones } from "./notificacion/notificacion.types.js";
import type { PlanificadorNotificacionesService } from "./planificador-notificaciones/planificador-notificaciones.service.js";
import type { SuscripcionPushService } from "./suscripcion-push/suscripcion-push.service.js";
import type { DatosSuscripcion } from "./suscripcion-push/suscripcion-push.types.js";

// Realiza ILogicaNotificaciones pasando cada operación a su componente.
export class GestionNotificacionesService implements ILogicaNotificaciones {
  constructor(
    private readonly notificaciones: NotificacionService,
    private readonly planificador: PlanificadorNotificacionesService,
    private readonly suscripciones: SuscripcionPushService,
  ) {}

  // Render duerme el proceso sin tráfico, así que el intervalo no alcanza: los avisos del día se generan
  // también al consultarlos (arquitectura.md). Si fallan, la persona igual ve los que ya tenía.
  async listarNotificacionesPropias(
    idUsuario: number,
    paginacion: Paginacion,
  ): Promise<PaginaNotificaciones> {
    try {
      await this.planificador.generarAvisosDelDia();
    } catch (error) {
      registrarError("AVISOS_DE_CUOTA", error);
    }
    return this.notificaciones.listarDeUsuario(idUsuario, paginacion);
  }

  marcarNotificacionLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia> {
    return this.notificaciones.marcarLeida(idNotificacion, idUsuario);
  }

  marcarNotificacionesLeidas(idUsuario: number): Promise<{ marcadas: number }> {
    return this.notificaciones.marcarTodasLeidas(idUsuario);
  }

  obtenerClavePushPublica(): string | null {
    return this.suscripciones.clavePublica();
  }

  suscribirDispositivo(idUsuario: number, datos: DatosSuscripcion): Promise<void> {
    return this.suscripciones.suscribir(idUsuario, datos);
  }

  desuscribirDispositivo(idUsuario: number, endpoint: string): Promise<void> {
    return this.suscripciones.desuscribir(idUsuario, endpoint);
  }
}
