// RNF-04: los eventos de seguridad van por ahora al log del proceso, una línea JSON por
// evento para poder filtrarlos. El DER no tiene tabla de auditoría y se decidió no agregarla.
export type EventoSeguridad =
  | "LOGIN_NO_REGISTRADO"
  | "LOGIN_USUARIO_INACTIVO"
  | "MATRIZ_PERMISOS_MODIFICADA"
  | "ROL_ASIGNADO"
  | "ROL_QUITADO"
  | "ESTADO_USUARIO_MODIFICADO";

export function auditar(evento: EventoSeguridad, datos: Record<string, unknown>): void {
  console.warn(JSON.stringify({ auditoria: evento, fecha: new Date().toISOString(), ...datos }));
}
