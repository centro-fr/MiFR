// Un error que no corta la respuesta pero alguien tiene que ver: una línea JSON en el log del proceso,
// como la auditoría, con dónde ocurrió para poder rastrearlo.
export function registrarError(contexto: string, error: unknown): void {
  console.error(JSON.stringify({ error: contexto, fecha: new Date().toISOString() }), error);
}
