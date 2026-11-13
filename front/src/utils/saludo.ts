/**
 * Devuelve un saludo acorde al horario local actual, opcionalmente con el nombre del usuario.
 * - 06:00 a 11:59 -> ¡Buen día!
 * - 12:00 a 19:59 -> ¡Buenas tardes!
 * - 20:00 a 05:59 -> ¡Buenas noches!
 */
export function saludoSegunHorario(nombre?: string | null, fecha: Date = new Date()): string {
  const hora = fecha.getHours();
  let prefijo: string;
  if (hora >= 6 && hora < 12) {
    prefijo = "¡Buen día";
  } else if (hora >= 12 && hora < 20) {
    prefijo = "¡Buenas tardes";
  } else {
    prefijo = "¡Buenas noches";
  }

  const nombreLimpio = nombre?.trim();
  return nombreLimpio ? `${prefijo}, ${nombreLimpio}!` : `${prefijo}!`;
}

