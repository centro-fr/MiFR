// RNF-04: los eventos de seguridad van por ahora al log del proceso, una línea JSON por
// evento para poder filtrarlos. El DER no tiene tabla de auditoría y se decidió no agregarla.
// Por la misma vía queda quién cambió un precio (US-12) o los datos de un alumno (US-09), que el
// DER no registra, cada movimiento de dinero (US-15, US-17) y cada suplencia, que decide a qué
// profesora se le paga una clase (US-24).
export type EventoSeguridad =
  | "LOGIN_NO_REGISTRADO"
  | "LOGIN_DESARROLLO"
  | "LOGIN_USUARIO_INACTIVO"
  | "MATRIZ_PERMISOS_MODIFICADA"
  | "ROL_ASIGNADO"
  | "ROL_QUITADO"
  | "ESTADO_USUARIO_MODIFICADO"
  | "PRECIO_PLAN_REGISTRADO"
  | "PARAMETRO_MODIFICADO"
  | "ALUMNO_MODIFICADO"
  | "COBRO_EFECTIVO_REGISTRADO"
  | "TRANSFERENCIA_RECIBIDA_REGISTRADA"
  | "TRANSFERENCIA_APROBADA"
  | "TRANSFERENCIA_RECHAZADA"
  | "SUPLENCIA_REGISTRADA"
  | "SUPLENCIA_MODIFICADA"
  | "SUPLENCIA_ELIMINADA";

export function auditar(evento: EventoSeguridad, datos: Record<string, unknown>): void {
  console.warn(JSON.stringify({ auditoria: evento, fecha: new Date().toISOString(), ...datos }));
}
