import type { actividades, horarios, profesoras } from "@prisma/client";

export type Horario = horarios;
export type HorarioConDatos = Horario & { actividad: actividades; profesora: profesoras };

export interface FiltroHorario {
  id_actividad?: number;
  id_profesora?: number;
}

export type HorarioRespuesta = HorarioConDatos & {
  cupo_maximo_efectivo: number | null;
};

export interface HorarioConAdvertencia {
  horario: HorarioRespuesta;
  advertencia: string;
}
