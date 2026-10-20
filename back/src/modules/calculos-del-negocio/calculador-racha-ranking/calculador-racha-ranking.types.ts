// Una marca de asistencia en una clase dictada. Las canceladas no tienen marcas, así que no cortan
// ni suman a la racha (US-31); una suplencia es una clase dictada más.
export interface MarcaDeAsistencia {
  asistio: boolean;
  // Inicio de la clase: ordena dos clases del mismo día y fecha el logro de una insignia.
  inicio: Date;
}

export interface ResumenRacha {
  actual: number;
  mejor: number;
  // Inicio de la primera clase de la racha actual; null si la racha actual es 0.
  inicio_actual: Date | null;
  clases_asistidas: number;
}

export type CriterioDeLogro = "RACHA" | "TOTAL_CLASES";

export interface ProximoHito {
  umbral: number;
  faltantes: number;
}

export interface FilaParaRanking {
  id_alumno: number;
  nombre: string;
  apellido: string;
  clases_asistidas: number;
  porcentaje_asistencia: number;
}
