import { db } from "@/mocks/db";

export function hoyEnArgentina(): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((item) => item.type === tipo)?.value ?? "";
  return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

export function precioVigenteDePlan(idPlan: number, hoy = hoyEnArgentina()) {
  return db.planPrecios
    .filter((precio) => {
      const desde = precio.fecha_vigencia_desde.slice(0, 10);
      const hasta = precio.fecha_vigencia_hasta?.slice(0, 10);
      return precio.id_plan === idPlan && desde <= hoy && (!hasta || hasta >= hoy);
    })
    .sort((a, b) => b.fecha_vigencia_desde.localeCompare(a.fecha_vigencia_desde))[0];
}

export function precioProgramadoDePlan(idPlan: number, hoy = hoyEnArgentina()) {
  return db.planPrecios
    .filter((precio) => precio.id_plan === idPlan && precio.fecha_vigencia_desde.slice(0, 10) > hoy)
    .sort((a, b) => a.fecha_vigencia_desde.localeCompare(b.fecha_vigencia_desde))[0];
}
