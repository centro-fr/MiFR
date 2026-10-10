// Formateo de los datos de la ficha para mostrarlos. Funciones puras: se testean sin render.

const FORMATO_FECHA = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** "1996-04-24" → "24/04/1996". Se formatea en UTC porque es una fecha sin hora. */
export function formatearFecha(fechaCalendario: string): string {
  return FORMATO_FECHA.format(new Date(`${fechaCalendario}T00:00:00Z`));
}

/** Timestamp ISO → "15/03/2023" en el huso horario de quien mira. */
export function formatearDiaDeTimestamp(timestamp: string): string {
  const fecha = new Date(timestamp);
  return FORMATO_FECHA.format(new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())));
}

/** Años cumplidos a la fecha `hoy` (el cumpleaños cuenta desde ese mismo día). */
export function calcularEdad(fechaNacimiento: string, hoy: Date = new Date()): number {
  const [anio, mes, dia] = fechaNacimiento.split("-").map(Number);
  const yaCumplio = hoy.getMonth() + 1 > mes || (hoy.getMonth() + 1 === mes && hoy.getDate() >= dia);
  return hoy.getFullYear() - anio - (yaCumplio ? 0 : 1);
}

export function textoEdad(edad: number): string {
  return edad === 1 ? "1 año" : `${edad} años`;
}

/** El DER guarda el DNI solo con dígitos: "38412985" → "38.412.985". */
export function formatearDni(dni: string): string {
  return dni.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function inicialesDe(nombre: string, apellido: string): string {
  return `${nombre.trim().charAt(0)}${apellido.trim().charAt(0)}`.toUpperCase();
}

/** Enlace tel: con solo dígitos y el "+" inicial, para no inyectar nada raro en el href. */
export function enlaceTelefono(telefono: string): string {
  const limpio = telefono.trim();
  const prefijo = limpio.startsWith("+") ? "+" : "";
  return `tel:${prefijo}${limpio.replace(/\D/g, "")}`;
}

/**
 * wa.me exige el número en formato internacional. El teléfono es texto libre, así que solo
 * se arma el enlace cuando ya viene con "+código de país"; si no, adivinar el país podría
 * abrir el chat de otra persona.
 */
export function enlaceWhatsApp(telefono: string): string | null {
  const limpio = telefono.trim();
  if (!limpio.startsWith("+")) return null;
  const digitos = limpio.replace(/\D/g, "");
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : null;
}
