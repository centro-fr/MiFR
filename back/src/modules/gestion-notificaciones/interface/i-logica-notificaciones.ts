import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { NotificacionPropia, PaginaNotificaciones } from "../notificacion/notificacion.types.js";
import type { ResumenDiario } from "../resumen-diario-propietaria/resumen-diario-propietaria.types.js";

// La parte de ILogicaNotificaciones que usa el controller de ResumenDiarioPropietaria. No es una
// interfaz nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaResumenDiario {
  obtenerResumenDiario(): Promise<ResumenDiario>;
}

// La parte que usa el controller de Notificacion (US-25): cada persona con sus propias notificaciones.
export interface ILogicaNotificacionesPropias {
  listarNotificacionesPropias(idUsuario: number, paginacion: Paginacion): Promise<PaginaNotificaciones>;
  marcarNotificacionLeida(idNotificacion: number, idUsuario: number): Promise<NotificacionPropia>;
  marcarNotificacionesLeidas(idUsuario: number): Promise<{ marcadas: number }>;
}

// Interfaz del subsistema GestionNotificaciones en la vista arquitectónica: lo que consume la
// presentación. Los procesos del subsistema guardan sus avisos con IRegistroNotificaciones.
export interface ILogicaNotificaciones extends ILogicaResumenDiario, ILogicaNotificacionesPropias {}
