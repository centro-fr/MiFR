import type { ModalidadActividad } from "@/types/actividad";

export type DiaSemana = "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO" | "DOMINGO";

export interface TemaHorario {
  primary: string; // Color principal (texto / bordes)
  bg: string; // Fondo claro y suave de la tarjeta
  bgOscuro: string; // Fondo de la tarjeta en tema oscuro
  border: string; // Borde de la tarjeta
  badgeBg: string; // Fondo del badge de profesora
  badgeText: string; // Texto del badge de profesora
}

export interface Profesora {
  id: string;
  nombre: string;
  apellido: string;
}

export interface Horario {
  /** Id del back, o uno temporal ("nuevo-…") mientras el horario solo existe en el borrador. */
  id: string;
  actividadId: string;
  actividadNombre: string;
  actividadTipo: ModalidadActividad;
  profesoraId: string;
  profesoraNombre: string;
  /** Colores de la tarjeta según la modalidad de la actividad. */
  tema: TemaHorario;
  diaSemana: DiaSemana;
  horaInicio: string; // "HH:mm"
  horaFin: string; // "HH:mm"
  /** Cupo propio del horario; null = usa el de la actividad. */
  cupoPropio: number | null;
  /** Cupo que rige: el propio o, si no tiene, el de la actividad. null = sin límite. */
  cupoMaximo: number | null;
  /** Alumnos inscriptos, si el back lo informó (GET /horarios lo trae). */
  inscriptos?: number;
  /** Día ("AAAA-MM-DD") en que se programó la baja: no admite alumnos nuevos y sale cuando se va el último. */
  bajaProgramada?: string | null;
}

export interface HorarioFormData {
  actividadId: string;
  profesoraId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cupoPropio: number | null;
}
