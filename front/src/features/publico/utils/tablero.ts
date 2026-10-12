import type { Disponibilidad, HorarioPublico } from "@/features/publico/schemas/disponibilidad";

// El centro abre de lunes a sábado: el back numera los días de 1 (lunes) a 6 (sábado).
export const DIAS_DEL_CENTRO = [
  { numero: 1, nombre: "Lunes", corto: "Lun" },
  { numero: 2, nombre: "Martes", corto: "Mar" },
  { numero: 3, nombre: "Miércoles", corto: "Mié" },
  { numero: 4, nombre: "Jueves", corto: "Jue" },
  { numero: 5, nombre: "Viernes", corto: "Vie" },
  { numero: 6, nombre: "Sábado", corto: "Sáb" },
] as const;

// El back serializa las horas sobre el 1970-01-01 en UTC: "1970-01-01T09:00:00.000Z" → "09:00".
export function horaDesdeApi(valor: string): string {
  return valor.slice(11, 16);
}

// Ya vienen ordenados por día y hora; se agrupan sin reordenar.
export function agruparPorDia(horarios: HorarioPublico[]): Map<number, HorarioPublico[]> {
  const porDia = new Map<number, HorarioPublico[]>(DIAS_DEL_CENTRO.map(({ numero }) => [numero, []]));
  for (const horario of horarios) porDia.get(horario.dia_semana)?.push(horario);
  return porDia;
}

// Date.getDay() cuenta el domingo como 0. El domingo el centro está cerrado: se muestra el lunes.
export function diaInicial(hoy: Date): number {
  const dia = hoy.getDay();
  return dia === 0 ? 1 : dia;
}

export function textoDisponibilidad(disponibilidad: Disponibilidad, lugares: number | null): string {
  switch (disponibilidad) {
    case "SIN_LIMITE":
      return "Sin límite de cupo";
    case "COMPLETO":
      return "Completo";
    case "CASI_LLENO":
      return lugares === 1 ? "Último lugar" : `Últimos ${lugares} lugares`;
    case "LIBRE":
      return lugares === 1 ? "1 lugar libre" : `${lugares} lugares libres`;
  }
}
