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

export type DiaDelCentro = (typeof DIAS_DEL_CENTRO)[number];

export type Turno = "Mañana" | "Tarde" | "Noche";

export interface HorasDelTurno {
  turno: Turno;
  horas: string[];
}

// El back serializa las horas sobre el 1970-01-01 en UTC: "1970-01-01T09:00:00.000Z" → "09:00".
export function horaDesdeApi(valor: string): string {
  return valor.slice(11, 16);
}

// Los turnos de la cartelera del centro: hasta el mediodía, la tarde y desde las 19.
export function turnoDe(hora: string): Turno {
  if (hora < "13:00") return "Mañana";
  if (hora < "19:00") return "Tarde";
  return "Noche";
}

// Las filas de la cartelera: cada hora en la que empieza alguna clase, agrupadas por turno. Las horas
// sin clases no ocupan lugar, así un mediodía libre no deja un hueco en la página.
export function horasPorTurno(horarios: HorarioPublico[]): HorasDelTurno[] {
  const horas = [...new Set(horarios.map(({ hora_inicio }) => horaDesdeApi(hora_inicio)))].sort();
  const turnos: HorasDelTurno[] = [];
  for (const hora of horas) {
    const turno = turnoDe(hora);
    const ultimo = turnos.at(-1);
    if (ultimo?.turno === turno) ultimo.horas.push(hora);
    else turnos.push({ turno, horas: [hora] });
  }
  return turnos;
}

// Solo los días con alguna clase: una columna vacía no le dice nada a quien visita.
export function diasConClases(horarios: HorarioPublico[]): DiaDelCentro[] {
  const dias = new Set(horarios.map(({ dia_semana }) => dia_semana));
  return DIAS_DEL_CENTRO.filter(({ numero }) => dias.has(numero));
}

// Ya vienen ordenados por día y hora; se filtran sin reordenar.
export function clasesDe(horarios: HorarioPublico[], dia: number, hora?: string): HorarioPublico[] {
  return horarios.filter(
    (horario) =>
      horario.dia_semana === dia && (hora === undefined || horaDesdeApi(horario.hora_inicio) === hora),
  );
}

// El día que se muestra primero en el celular: hoy si tiene clases, si no el próximo que tenga.
// Date.getDay() cuenta el domingo como 0, y el domingo el centro está cerrado.
export function diaInicial(hoy: Date, dias: DiaDelCentro[]): number | undefined {
  const deHoy = hoy.getDay();
  return (dias.find(({ numero }) => numero >= deHoy) ?? dias[0])?.numero;
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
