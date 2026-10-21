import type { estado_liquidacion } from "@prisma/client";
import type {
  AdvertenciaHonorario,
  ConceptoDetalle,
  DetalleHonorario,
} from "../../calculos-del-negocio/calculador-honorarios/calculador-honorarios.types.js";

export type EstadoLiquidacion = estado_liquidacion;

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

export type LiquidacionConProfesora = Liquidacion & {
  profesora: { id_profesora: number; usuario: { nombre: string; apellido: string } };
};

// Una línea del detalle: por alumno (ALUMNO_A_CARGO) o por clase suplida (CLASE_SUPLIDA y
// DESCUENTO_AUSENCIA).
export interface DetalleLiquidacion {
  id_liq_detalle: number;
  id_tarifa: number;
  concepto: ConceptoDetalle;
  id_inscripcion: number | null;
  id_clase: number | null;
  monto: number;
  alumno: { id_alumno: number; nombre: string; apellido: string } | null;
  clase: { fecha_clase: Date; hora_inicio: Date; hora_fin: Date; actividad: string } | null;
}

export type LiquidacionDetallada = LiquidacionConProfesora & { detalles: DetalleLiquidacion[] };

// Lo que el service le pasa al repositorio por cada profesora.
export interface BorradorLiquidacion {
  id_profesora: number;
  monto_total: number;
  detalles: Omit<DetalleHonorario, "id_profesora">[];
}

export interface ResultadoGuardado {
  liquidaciones: LiquidacionConProfesora[];
  // Profesoras que ya tenían la liquidación CERRADA o PAGADA: no se recalculan.
  sin_recalcular: number[];
}

export interface ResumenLiquidaciones {
  periodo: string;
  total_general: number;
  liquidaciones: LiquidacionConProfesora[];
}

export interface ResultadoGeneracion extends ResumenLiquidaciones {
  advertencias: AdvertenciaHonorario[];
  sin_recalcular: number[];
}
