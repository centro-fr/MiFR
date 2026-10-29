// Reportes de la propietaria (US-33 y US-35), como los usan las pantallas.

export interface FiltrosInscripciones {
  anio: number;
  idPlan: number | null;
  idProfesora: number | null;
}

export interface AltasDelMes {
  /** 1 = enero … 12 = diciembre. */
  mes: number;
  anio: number;
  /** "Enero". */
  nombre: string;
  cantidad: number;
  /** Altas de este mes menos las del anterior; null en el primer mes del período. */
  diferencia: number | null;
  /** % de variación con el mes anterior; null si es el primero o si el anterior tuvo 0. */
  variacion: number | null;
}

export interface EstadisticasInscripciones {
  anio: number;
  totalAltas: number;
  /** El mes con más altas; null si no hubo ninguna. */
  mesPico: Pick<AltasDelMes, "mes" | "anio" | "nombre" | "cantidad"> | null;
  meses: AltasDelMes[];
}

// ---------- Informe de asistencia (US-33) ----------

export interface FiltrosInformeAsistencia {
  /** AAAA-MM-DD. */
  desde: string;
  /** AAAA-MM-DD. */
  hasta: string;
  idAlumno: number | null;
  idProfesora: number | null;
  idActividad: number | null;
  incluirBajas: boolean;
}

export interface ResumenAsistencia {
  clasesDictadas: number;
  asistencias: number;
  /** Incluye las que registró el cierre automático (US-21). */
  inasistencias: number;
  porcentaje: number;
}

export interface AsistenciaDeProfesora {
  id: number;
  nombre: string;
  apellido: string;
  clasesDictadas: number;
  cantidadAlumnos: number;
  asistencias: number;
  porcentajePromedio: number;
}

export interface AsistenciaDeAlumno {
  id: number;
  nombre: string;
  apellido: string;
  dadoDeBaja: boolean;
  clasesPrevistas: number;
  asistencias: number;
  inasistencias: number;
  porcentaje: number;
}

export interface InformeAsistencia {
  /** AAAA-MM-DD: el período que tomó el back. */
  desde: string;
  hasta: string;
  resumen: ResumenAsistencia;
  porProfesora: AsistenciaDeProfesora[];
  /** Una página de alumnos, ordenados por apellido. */
  alumnos: AsistenciaDeAlumno[];
  totalAlumnos: number;
  offset: number;
}
