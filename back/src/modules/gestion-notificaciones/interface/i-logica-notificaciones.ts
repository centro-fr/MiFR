import type { ResumenDiario } from "../resumen-diario-propietaria/resumen-diario-propietaria.types.js";

// La parte de ILogicaNotificaciones que usa el controller de ResumenDiarioPropietaria. No es una
// interfaz nueva del diagrama: la que provee el subsistema es la unión.
export interface ILogicaResumenDiario {
  obtenerResumenDiario(): Promise<ResumenDiario>;
}

// Interfaz del subsistema GestionNotificaciones en la vista arquitectónica: lo que consume la
// presentación. Por ahora solo el resumen diario (US-26); los avisos de Notificacion se suman acá.
export interface ILogicaNotificaciones extends ILogicaResumenDiario {}
