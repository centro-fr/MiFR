import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { NotificacionPropia, PaginaNotificaciones } from "../notificacion/notificacion.types.js";

// La parte que usa el controller de Notificacion (US-25): cada persona con sus propias notificaciones.
// No es una interfaz nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaNotificacionesPropias {
  listarNotificacionesPropias(idUsuario: number, paginacion: Paginacion): Promise<PaginaNotificaciones>;
  marcarNotificacionLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia>;
  marcarNotificacionesLeidas(idUsuario: number): Promise<{ marcadas: number }>;
}

// Interfaz del subsistema GestionNotificaciones en la vista arquitectónica: lo que consume la
// presentación. Los procesos del subsistema guardan sus avisos con IRegistroNotificaciones.
export interface ILogicaNotificaciones extends ILogicaNotificacionesPropias {}
