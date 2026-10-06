export type TipoActividad = 'GRUPAL' | 'PERSONALIZADA';

export type DiaSemana = 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';

export interface ProfesoraColorTheme {
  primary: string;       // Color principal (texto / bordes)
  bg: string;            // Fondo claro y suave de la tarjeta
  border: string;        // Borde de la tarjeta
  badgeBg: string;       // Fondo del badge de profesora
  badgeText: string;     // Texto del badge de profesora
}

export interface Profesora {
  id: string;
  id_profesora?: string | number;
  nombre: string;
  apellido: string;
  email: string;
  avatarUrl?: string;
  colorTheme: ProfesoraColorTheme;
  activa: boolean;
}

export interface Actividad {
  id: string;
  id_actividad?: string | number;
  nombre: string;
  descripcion: string;
  tipo: TipoActividad;
  tipo_actividad?: TipoActividad;
  cupoMaximoBase?: number; // Obligatorio en PERSONALIZADA, opcional en GRUPAL
  cupo_maximo?: number;
  activa: boolean;
}

// DTO oficial del contrato API (snake_case)
export interface HorarioDTO {
  id_horario: string | number;
  id_actividad: string | number;
  id_profesora: string | number;
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
  cupo_maximo?: number | null;
  tipo_actividad?: TipoActividad;
  inscriptos_actuales?: number;
  inscriptos?: number;
}

export interface Horario {
  id: string;
  id_horario?: string;
  actividadId: string;
  id_actividad?: string;
  actividadNombre: string;
  actividadTipo: TipoActividad;
  tipo_actividad?: TipoActividad;
  profesoraId: string;
  id_profesora?: string;
  profesoraNombre: string;
  profesoraTheme: ProfesoraColorTheme;
  diaSemana: DiaSemana;
  dia_semana?: DiaSemana;
  horaInicio: string; // formato "HH:mm" (ej: "08:00")
  hora_inicio?: string;
  horaFin: string;    // formato "HH:mm" (ej: "09:00")
  hora_fin?: string;
  cupoMaximo: number; // Cupo efectivo asignado a esta franja
  cupo_maximo?: number;
  inscriptosActuales: number;
  inscriptos_actuales?: number;
  inscriptos?: number;
}

export interface HorarioFormData {
  actividadId: string;
  profesoraId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFin: string;
  cupoMaximo?: number;
  // Campos en convención snake_case
  id_actividad?: string;
  id_profesora?: string;
  dia_semana?: DiaSemana;
  hora_inicio?: string;
  hora_fin?: string;
  cupo_maximo?: number;
}

export interface SaveHorarioOptions {
  desvincularInscriptos?: boolean;
}

