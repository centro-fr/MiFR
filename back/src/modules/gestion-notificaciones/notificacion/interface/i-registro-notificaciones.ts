import type { NuevaNotificacion } from "../notificacion.types.js";

// Interfaz provista por Notificacion (GestionNotificaciones) en la vista arquitectónica: la usan los
// procesos del subsistema, PlanificadorNotificaciones (US-25) y ResumenDiarioPropietaria (US-26), para
// guardar los avisos sin conocer su persistencia. Leerlos y marcarlos leídos queda en ILogicaNotificaciones.
export interface IRegistroNotificaciones {
  // Guarda las que no existían. Un aviso de cuota repetido (mismo usuario, cuota y tipo) se ignora por el
  // único de la base: volver a correr un proceso no lo duplica. Devuelve cuántas guardó.
  registrar(notificaciones: NuevaNotificacion[]): Promise<number>;
  // Guarda el resumen diario de la propietaria si no fue generado ya en ese día (con bloqueo advisory).
  registrarResumenDiario(idUsuario: number, mensaje: string, ahora: Date, fechaDia: Date): Promise<boolean>;
}
