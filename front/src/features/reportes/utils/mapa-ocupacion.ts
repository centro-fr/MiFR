import type { HorarioOcupado, NivelOcupacion } from "@/types/reportes";

export type NivelDeCelda = NivelOcupacion | "SIN_ACTIVIDAD";

export interface CeldaDelMapa {
  /** 1 = lunes … 7 = domingo. */
  dia: number;
  hora: string;
  horarios: HorarioOcupado[];
  /** Inscriptos sobre la suma de los cupos de la franja; null si ningún horario tiene cupo. */
  porcentaje: number | null;
  nivel: NivelDeCelda;
}

export interface FranjaDelMapa {
  hora: string;
  celdas: CeldaDelMapa[];
}

export const DIAS_DEL_MAPA = [1, 2, 3, 4, 5, 6, 7] as const;

/** Los mismos umbrales que el back (generador-informes): 100 completo, 85 casi lleno, 60 moderado. */
export function nivelDelPorcentaje(porcentaje: number): NivelOcupacion {
  if (porcentaje >= 100) return "COMPLETO";
  if (porcentaje >= 85) return "CASI_LLENO";
  if (porcentaje >= 60) return "MODERADO";
  return "LIBRE";
}

function armarCelda(dia: number, hora: string, horarios: HorarioOcupado[]): CeldaDelMapa {
  if (horarios.length === 0) return { dia, hora, horarios, porcentaje: null, nivel: "SIN_ACTIVIDAD" };
  const conCupo = horarios.filter((horario) => horario.cupo !== null && horario.cupo > 0);
  if (conCupo.length === 0) return { dia, hora, horarios, porcentaje: null, nivel: "SIN_CUPO" };
  const inscriptos = conCupo.reduce((total, horario) => total + horario.inscriptos, 0);
  const cupo = conCupo.reduce((total, horario) => total + (horario.cupo ?? 0), 0);
  const porcentaje = Math.round((inscriptos / cupo) * 1000) / 10;
  return { dia, hora, horarios, porcentaje, nivel: nivelDelPorcentaje(porcentaje) };
}

/**
 * Una fila por hora de inicio y una columna por día. Si en la misma franja hay varios horarios (dos
 * actividades a la vez), la celda suma sus inscriptos y sus cupos: muestra qué tan lleno está el centro
 * a esa hora.
 */
export function armarMapaDeOcupacion(horarios: HorarioOcupado[]): FranjaDelMapa[] {
  const horas = [...new Set(horarios.map(({ horaInicio }) => horaInicio))].sort();
  return horas.map((hora) => ({
    hora,
    celdas: DIAS_DEL_MAPA.map((dia) =>
      armarCelda(
        dia,
        hora,
        horarios.filter((horario) => horario.diaSemana === dia && horario.horaInicio === hora),
      ),
    ),
  }));
}
