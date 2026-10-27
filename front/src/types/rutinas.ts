// Rutina y evolución física de un alumno (US-27 y US-28), como las usan las pantallas.

/** Alumno cuya rutina puede consultar quien inició sesión: el propio o un menor a su cargo (US-28). */
export interface AlumnoConsultable {
  id: number;
  nombre: string;
  apellido: string;
  /** true si es el alumno que inició sesión; false si es un menor a cargo del tutor. */
  propio: boolean;
  dadoDeBaja: boolean;
}

export interface EjercicioDeRutina {
  nombre: string;
  series: number;
  /** Texto: admite "12", "8-10" o "30 s". */
  repeticiones: string;
  notas: string | null;
}

export interface DiaDeRutina {
  nombre: string;
  ejercicios: EjercicioDeRutina[];
}

export interface Rutina {
  id: number;
  idProfesora: number;
  nombre: string;
  /** AAAA-MM-DD. */
  desde: string;
  /** AAAA-MM-DD; null si no tiene fecha de fin. */
  hasta: string | null;
  dias: DiaDeRutina[];
  observaciones: string | null;
  /** Solo una por alumno: cargar otra la pasa al historial. */
  vigente: boolean;
}

export interface MedidaRegistrada {
  /** Código de tipos_medida: PESO, CINTURA, etc. */
  codigo: string;
  unidad: string;
  valor: number;
}

export interface Medicion {
  id: number;
  idProfesora: number;
  /** AAAA-MM-DD. */
  fecha: string;
  observaciones: string | null;
  medidas: MedidaRegistrada[];
}
