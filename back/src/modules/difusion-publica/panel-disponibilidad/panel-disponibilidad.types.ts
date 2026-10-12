import type { modalidad_actividad } from "@prisma/client";

// US-32: la escala del indicador de cupo. SIN_LIMITE es un horario sin cupo máximo.
export type Disponibilidad = "LIBRE" | "CASI_LLENO" | "COMPLETO" | "SIN_LIMITE";

// Lo que ve un visitante sin sesión: ningún dato de alumnos ni de cuentas, solo la oferta del centro.
export interface HorarioPublico {
  id_horario: number;
  dia_semana: number;
  hora_inicio: Date;
  hora_fin: Date;
  actividad: {
    id_actividad: number;
    nombre: string;
    descripcion: string | null;
    modalidad: modalidad_actividad;
  };
  profesora: { nombre: string; apellido: string };
  cupo_maximo: number | null;
  cupo_disponible: number | null;
  disponibilidad: Disponibilidad;
}

export interface PanelDisponibilidad {
  horarios: HorarioPublico[];
}
