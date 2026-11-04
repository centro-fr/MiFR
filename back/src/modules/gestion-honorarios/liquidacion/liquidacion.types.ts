import type { estado_inscripcion, estado_liquidacion } from "@prisma/client";
import type {
  AdvertenciaHonorario,
  ConceptoDetalle,
  DetalleHonorario,
} from "../../calculos-del-negocio/calculador-honorarios/calculador-honorarios.types.js";

export type EstadoLiquidacion = estado_liquidacion;
export type EstadoInscripcion = estado_inscripcion;

// El período AAAA-MM con su primer y último día (DATE a las 00:00 UTC).
export interface PeriodoLiquidacion {
  periodo: string;
  desde: Date;
  hasta: Date;
}

// monto_total es NUMERIC(12,2) y Prisma lo entrega como Decimal: el dominio usa number.
export interface Liquidacion {
  id_liquidacion: number;
  id_profesora: number;
  periodo_desde: Date;
  periodo_hasta: Date;
  fecha_liquidacion: Date;
  monto_total: number;
  estado: EstadoLiquidacion;
}

export interface ProfesoraResumen {
  id_profesora: number;
  usuario: { nombre: string; apellido: string };
}

export type LiquidacionConProfesora = Liquidacion & { profesora: ProfesoraResumen };

// Lo que el listado de un mes muestra de cada profesora sin abrir su detalle: cuántas líneas de alumno
// tiene, cuánto suman y el neto de sus suplencias (CLASE_SUPLIDA más DESCUENTO_AUSENCIA, que puede ser
// negativo). monto_total = subtotal_alumnos + subtotal_suplencias.
export interface DesgloseLiquidacion {
  cantidad_alumnos: number;
  subtotal_alumnos: number;
  subtotal_suplencias: number;
}

export type LiquidacionConDesglose = LiquidacionConProfesora & DesgloseLiquidacion;

// Una línea del detalle: por alumno (ALUMNO_A_CARGO) o por clase suplida (CLASE_SUPLIDA y
// DESCUENTO_AUSENCIA). En las de alumno vienen su plan y su situación (inscripcion); en las de
// suplencia, quién faltó y quién cubrió (clase.profesora_titular y clase.profesora_suplente).
export interface DetalleLiquidacion {
  id_liq_detalle: number;
  id_tarifa: number;
  concepto: ConceptoDetalle;
  id_inscripcion: number | null;
  id_clase: number | null;
  monto: number;
  alumno: { id_alumno: number; nombre: string; apellido: string } | null;
  inscripcion: {
    estado: EstadoInscripcion;
    fecha_baja: Date | null;
    plan: { id_plan: number; nombre: string };
  } | null;
  clase: {
    fecha_clase: Date;
    hora_inicio: Date;
    hora_fin: Date;
    actividad: string;
    // Sale de la suplencia registrada, no del horario: si el horario pasa a otra profesora después,
    // el horario ya no dice quién faltó ese día. Es null si la suplencia se eliminó con la liquidación
    // todavía en BORRADOR.
    profesora_titular: ProfesoraResumen | null;
    profesora_suplente: ProfesoraResumen;
  } | null;
}

export type LiquidacionDetallada = LiquidacionConProfesora & { detalles: DetalleLiquidacion[] };

// Lo que el service le pasa al repositorio por cada profesora.
export interface BorradorLiquidacion {
  id_profesora: number;
  monto_total: number;
  detalles: Omit<DetalleHonorario, "id_profesora">[];
}

export interface ResultadoGuardado {
  liquidaciones: LiquidacionConDesglose[];
  // Profesoras que ya tenían la liquidación CERRADA o PAGADA: no se recalculan.
  sin_recalcular: number[];
}

export interface ResumenLiquidaciones {
  periodo: string;
  total_general: number;
  liquidaciones: LiquidacionConDesglose[];
}

export interface ResultadoGeneracion extends ResumenLiquidaciones {
  advertencias: AdvertenciaHonorario[];
  sin_recalcular: number[];
}

// Lo que deja el cierre de un mes: cuántas liquidaciones pasaron de BORRADOR a CERRADA.
export interface ResumenCierreHonorarios {
  periodo: string;
  cerradas: number;
}
