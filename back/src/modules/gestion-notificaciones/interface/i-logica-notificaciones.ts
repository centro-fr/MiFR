import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { NotificacionPropia, PaginaNotificaciones } from "../notificacion/notificacion.types.js";
import type { DatosSuscripcion } from "../suscripcion-push/suscripcion-push.types.js";

// La parte que usa el controller de Notificacion (US-25): cada persona con sus propias notificaciones.
// No es una interfaz nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaNotificacionesPropias {
  listarNotificacionesPropias(idUsuario: number, paginacion: Paginacion): Promise<PaginaNotificaciones>;
  marcarNotificacionLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia>;
  marcarNotificacionesLeidas(idUsuario: number): Promise<{ marcadas: number }>;
}

// Interfaz del subsistema GestionNotificaciones en la vista arquitectónica: lo que consume la
// presentación. Los procesos del subsistema guardan sus avisos con IRegistroNotificaciones.
// La parte que usa el controller de SuscripcionPush: cada persona suscribe y da de baja sus dispositivos.
export interface ILogicaSuscripcionesPush {
  obtenerClavePushPublica(): string | null;
  suscribirDispositivo(idUsuario: number, datos: DatosSuscripcion): Promise<void>;
  desuscribirDispositivo(idUsuario: number, endpoint: string): Promise<void>;
}

export interface ILogicaNotificaciones extends ILogicaNotificacionesPropias, ILogicaSuscripcionesPush {}
