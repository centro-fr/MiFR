/**
 * Hoy en Argentina como AAAA-MM-DD. No sirve new Date().toISOString(): da el día en UTC, que desde
 * las 21 h de Argentina ya es mañana.
 */
export function fechaActualArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: "year" | "month" | "day") => partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

/** "2026-11-20" → "20/11/2026". Sin pasar por Date: es una fecha de calendario, no un instante. */
export function fechaCalendarioCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}
