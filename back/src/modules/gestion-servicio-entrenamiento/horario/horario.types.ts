import type { actividades, horarios } from "@prisma/client";
import type { Profesora } from "../../gestion-personas/profesor/profesor.types.js";

export type Horario = horarios;
export type HorarioConDatos = Horario & { actividad: actividades; profesora: Profesora };

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
