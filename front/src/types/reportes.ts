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
  /** Alumnos que se dieron de baja en el mes. */
  bajas: number;
  /** Alumnos activos al terminar el mes; null si el mes todavía no empezó. */
  activosAlCierre: number | null;
}

export type MotivoBaja = "ABANDONO" | "MUDANZA" | "SALUD" | "ECONOMICO" | "CAMBIO_PLAN" | "OTRO";

/** Por qué se fueron y cuánto se quedaron los que se dieron de baja en el año. */
export interface BajasDelAnio {
  /** De más a menos. El motivo es null en bajas viejas, de antes de que fuera obligatorio. */
  motivos: { motivo: MotivoBaja | null; cantidad: number }[];
  permanencia: {
    cantidad: number;
    /** Meses promedio entre el alta y la baja; null si nadie se fue. */
    promedioMeses: number | null;
    /** Cuántos se fueron antes de cumplir 90 días. */
    primerosTresMeses: number;
  };
}

export interface EstadisticasInscripciones {
  anio: number;
  totalAltas: number;
  totalBajas: number;
  /** Alumnos activos al empezar el año. */
  activosAlInicio: number;
  bajas: BajasDelAnio;
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

// ---------- Planes más elegidos (US-36) ----------

export interface FiltrosPlanesReporte {
  idActividad: number | null;
  idProfesora: number | null;
}

export interface PlanDelReporte {
  id: number;
  nombre: string;
  tipo: "MENSUAL" | "CLASE_SUELTA";
  actividad: string | null;
  alumnos: number;
  porcentaje: number;
  precioVigente: number | null;
  ingresoEstimado: number;
}

export interface EstadisticasPlanes {
  alumnosActivos: number;
  ingresoEstimado: number;
  totalPlanes: number;
  planes: PlanDelReporte[];
}

// ---------- Ocupación de horarios (US-37) ----------

export type NivelOcupacion = "LIBRE" | "MODERADO" | "CASI_LLENO" | "COMPLETO" | "SIN_CUPO";

export interface FiltrosOcupacion {
  idActividad: number | null;
  idProfesora: number | null;
  modalidad: "GRUPAL" | "PERSONALIZADA" | null;
}

export interface HorarioOcupado {
  id: number;
  /** 1 = lunes … 7 = domingo, como el back. */
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
  actividad: string;
  modalidad: "GRUPAL" | "PERSONALIZADA";
  profesora: string;
  cupo: number | null;
  inscriptos: number;
  porcentaje: number | null;
  nivel: NivelOcupacion;
}

export interface InformeOcupacion {
  totalHorarios: number;
  ocupacionTotal: number;
  porNivel: Record<NivelOcupacion, number>;
  horarios: HorarioOcupado[];
}

// ---------- Cobranza ----------

export interface FiltrosCobranza {
  desde: string;
  hasta: string;
  formaPago: "EFECTIVO" | "TRANSFERENCIA" | null;
  idProfesora: number | null;
}

export interface PagoDelReporte {
  id: number;
  fecha: string;
  monto: number;
  formaPago: "EFECTIVO" | "TRANSFERENCIA";
  alumno: string;
  plan: string;
  cobro: string | null;
}

export interface InformeCobranza {
  desde: string;
  hasta: string;
  totalCobrado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  cantidadPagos: number;
  pagos: PagoDelReporte[];
  total: number;
  offset: number;
}

// ---------- Cuotas vencidas (US-34) ----------

export interface FiltrosCuotasVencidas {
  idProfesora: number | null;
  idPlan: number | null;
}

export interface CuotaVencida {
  idInscripcion: number;
  alumno: string;
  telefono: string | null;
  email: string | null;
  plan: string;
  profesora: string;
  vencio: string;
  diasVencida: number;
  monto: number;
}

export interface DeudaDeProfesora {
  id: number;
  nombre: string;
  alumnos: number;
  monto: number;
}

export interface InformeCuotasVencidas {
  alumnosConDeuda: number;
  totalAdeudado: number;
  promedioPorAlumno: number;
  porProfesora: DeudaDeProfesora[];
  cuotas: CuotaVencida[];
  total: number;
  offset: number;
}
