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

export interface FranjaHoraria {
  inicio: string;
  fin: string;
}

// El back serializa las horas sobre el 1970-01-01 en UTC: "1970-01-01T09:00:00.000Z" → "09:00".
export function horaDesdeApi(valor: string): string {
  return valor.slice(11, 16);
}

// "18:30" → 1110.
export function minutosDeHora(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

export function minutosDesdeApi(valor: string): number {
  return minutosDeHora(horaDesdeApi(valor));
}

function horaEnPunto(hora: number): string {
  return `${String(hora).padStart(2, "0")}:00`;
}

// Las filas de la grilla, de una hora cada una, desde la primera clase hasta el fin de la última:
// el mismo criterio que el cronograma de la propietaria (CronogramaGridDesktop).
export function franjasHorarias(horarios: HorarioPublico[]): FranjaHoraria[] {
  if (horarios.length === 0) return [];
  const desde = Math.min(...horarios.map(({ hora_inicio }) => Math.floor(minutosDesdeApi(hora_inicio) / 60)));
  const hasta = Math.max(...horarios.map(({ hora_fin }) => Math.ceil(minutosDesdeApi(hora_fin) / 60)));
  return Array.from({ length: Math.max(hasta - desde, 1) }, (_, indice) => ({
    inicio: horaEnPunto(desde + indice),
    fin: horaEnPunto(desde + indice + 1),
  }));
}

// Ya vienen ordenados por día y hora; se filtran sin reordenar.
export function clasesDelDia(horarios: HorarioPublico[], dia: number): HorarioPublico[] {
  return horarios.filter(({ dia_semana }) => dia_semana === dia);
}

// El día que se muestra primero en el celular: hoy si tiene clases, si no el próximo que tenga.
// Date.getDay() cuenta el domingo como 0, y el domingo el centro está cerrado.
export function diaInicial(hoy: Date, horarios: HorarioPublico[]): number {
  const conClases = DIAS_DEL_CENTRO.filter(({ numero }) => clasesDelDia(horarios, numero).length > 0);
  const deHoy = hoy.getDay();
  return (conClases.find(({ numero }) => numero >= deHoy) ?? conClases[0] ?? DIAS_DEL_CENTRO[0]).numero;
}

export function textoDisponibilidad(disponibilidad: Disponibilidad, lugares: number | null): string {
  switch (disponibilidad) {
    case "SIN_LIMITE":
      return "Sin límite";
    case "COMPLETO":
      return "Completo";
    case "CASI_LLENO":
      return lugares === 1 ? "Último lugar" : `Últimos ${lugares}`;
    case "LIBRE":
      return lugares === 1 ? "1 libre" : `${lugares} libres`;
  }
}
