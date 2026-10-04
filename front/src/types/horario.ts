import type { Actividad } from "./actividad";
import type { Profesora } from "./profesora";

export interface Horario {
  id_horario: number;
  id_actividad: number;
  id_profesora: number;
  dia_semana: number; // 1 = Lunes ... 7 = Domingo
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo: number | null;
  fecha_alta: string;
  fecha_baja: string | null;
  actividad: Actividad;
  profesora: Profesora;
  cupo_maximo_efectivo: number | null;
}

export interface CrearHorarioInput {
  id_actividad: number;
  id_profesora: number;
  dia_semana: number;
  hora_inicio: string; // HH:mm
  hora_fin: string; // HH:mm
  cupo_maximo?: number | null;
}

export interface ActualizarHorarioInput {
  id_actividad?: number;
  id_profesora?: number;
  dia_semana?: number;
  hora_inicio?: string;
  hora_fin?: string;
  cupo_maximo?: number | null;
}
