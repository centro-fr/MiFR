// Honorarios de las profesoras como los usa la interfaz (US-23). Salen de las respuestas de
// /liquidaciones y /tarifas-honorario (features/honorarios/schemas).

/** BORRADOR se recalcula; CERRADA es una foto que ya no cambia; PAGADA, además, ya se le abonó. */
export type EstadoLiquidacion = "BORRADOR" | "CERRADA" | "PAGADA";

/** Por cada alumno a cargo, o por cada hora de clase que cubrió como suplente. */
export type ConceptoTarifa = "ALUMNO_A_CARGO" | "HORA_SUPLENCIA";

/** PORCENTAJE se aplica sobre lo cobrado de la cuota del alumno en el mes. */
export type TipoValorTarifa = "PORCENTAJE" | "MONTO_FIJO";

export interface ProfesoraDeLiquidacion {
  id: number;
  nombre: string;
  apellido: string;
}

/** Una fila por profesora: lo que alcanza para la tarjeta sin pedir el detalle. */
export interface LiquidacionResumen {
  id: number;
  estado: EstadoLiquidacion;
  /** Cuándo se calculó por última vez (timestamp ISO). */
  calculadaEl: string;
  montoTotal: number;
  profesora: ProfesoraDeLiquidacion;
  cantidadAlumnos: number;
  subtotalAlumnos: number;
  /** Neto de las suplencias: lo que cubrió suma y lo que le cubrieron resta. */
  subtotalSuplencias: number;
}

export interface InformeHonorarios {
  /** AAAA-MM. */
  periodo: string;
  /** AAAA-MM-DD. */
  desde: string;
  hasta: string;
  totalGeneral: number;
  liquidaciones: LiquidacionResumen[];
}

export interface TarifaAplicada {
  tipoValor: TipoValorTarifa;
  valor: number;
}

export interface LineaAlumno {
  id: number;
  monto: number;
  tarifa: TarifaAplicada;
  alumno: { nombre: string; apellido: string };
  plan: string;
  estadoInscripcion: "ACTIVA" | "BAJA";
  /** Timestamp ISO; solo si se dio de baja. */
  fechaBaja: string | null;
}

export interface ClaseDeSuplencia {
  /** AAAA-MM-DD. */
  fecha: string;
  /** HH:mm. */
  horaInicio: string;
  horaFin: string;
  actividad: string;
  ausente: ProfesoraDeLiquidacion;
  suplente: ProfesoraDeLiquidacion;
}

export interface LineaSuplencia {
  id: number;
  /** CLASE_SUPLIDA suma a la suplente; DESCUENTO_AUSENCIA resta a la titular (monto negativo). */
  concepto: "CLASE_SUPLIDA" | "DESCUENTO_AUSENCIA";
  monto: number;
  tarifa: TarifaAplicada;
  clase: ClaseDeSuplencia;
}

export interface LiquidacionDetalle {
  id: number;
  estado: EstadoLiquidacion;
  montoTotal: number;
  profesora: ProfesoraDeLiquidacion;
  alumnos: LineaAlumno[];
  suplencias: LineaSuplencia[];
}

export interface TarifaHonorario {
  id: number;
  idProfesora: number;
  concepto: ConceptoTarifa;
  /** null: rige para todos los planes. */
  plan: { id: number; nombre: string } | null;
  tipoValor: TipoValorTarifa;
  valor: number;
  /** AAAA-MM-DD. */
  desde: string;
  /** AAAA-MM-DD; null mientras siga vigente. */
  hasta: string | null;
}

/** Una línea que el back no pudo calcular (no se suma) y avisa al recalcular. */
export interface AdvertenciaHonorario {
  idProfesora: number;
  concepto: ConceptoTarifa;
  motivo: "SIN_TARIFA" | "TARIFA_NO_APLICABLE";
  idInscripcion: number | null;
  idClase: number | null;
}

export interface ResultadoCalculo {
  informe: InformeHonorarios;
  advertencias: AdvertenciaHonorario[];
}
