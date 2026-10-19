import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";
import type { FormaPago } from "../../gestion-cuotas-y-pagos/pago/pago.types.js";
import type { TipoPlan } from "../../gestion-servicio-entrenamiento/plan/plan.types.js";

// ============================================================
// 1. CUOTAS VENCIDAS (US-34)
// ============================================================

export interface FiltroCuotasVencidas extends Paginacion {
  desde?: Date;
  hasta?: Date;
  id_profesora?: number;
  id_alumno?: number;
  id_plan?: number;
}

export interface ItemCuotaVencida {
  id_inscripcion: number;
  alumno: {
    id_alumno: number;
    nombre: string;
    apellido: string;
    telefono: string | null;
    email: string | null;
  };
  plan: {
    id_plan: number;
    nombre: string;
  };
  profesora: {
    id_profesora: number;
    nombre: string;
    apellido: string;
  };
  fecha_vencimiento: string;
  dias_vencida: number;
  monto_adeudado: number;
}

export interface TotalesCuotasVencidasPorProfesora {
  id_profesora: number;
  nombre: string;
  apellido: string;
  cantidad_alumnos: number;
  monto_total: number;
}

export interface InformeCuotasVencidas {
  periodo: {
    desde: string | null;
    hasta: string | null;
  };
  resumen: {
    total_alumnos_vencidos: number;
    monto_total_adeudado: number;
    promedio_deuda_alumno: number;
  };
  por_profesora: TotalesCuotasVencidasPorProfesora[];
  datos: ItemCuotaVencida[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================
// 2. COBRANZA POR PERÍODO
// ============================================================

export interface FiltroCobranza extends Paginacion {
  desde?: Date;
  hasta?: Date;
  forma_pago?: FormaPago;
  id_profesora?: number;
}

export interface ItemCobranzaDetalle {
  id_pago: number;
  id_cuota: number;
  monto: number;
  forma_pago: FormaPago;
  fecha_pago: string;
  alumno: {
    id_alumno: number;
    nombre: string;
    apellido: string;
  };
  plan: {
    id_plan: number;
    nombre: string;
  };
  profesora_cobra: {
    id_profesora: number;
    nombre: string;
    apellido: string;
  } | null;
}

export interface TotalPorFormaPago {
  forma_pago: FormaPago;
  total: number;
  cantidad: number;
  porcentaje: number;
}

export interface InformeCobranza {
  periodo: {
    desde: string;
    hasta: string;
  };
  resumen: {
    total_cobrado: number;
    total_efectivo: number;
    total_transferencia: number;
    cantidad_pagos: number;
  };
  por_forma_pago: TotalPorFormaPago[];
  datos: ItemCobranzaDetalle[];
  total: number;
  limit: number;
  offset: number;
}

// ============================================================
// 3. ESTADÍSTICAS DE PLANES MÁS ELEGIDOS (US-36)
// ============================================================

export interface FiltroPlanes {
  id_actividad?: number;
  id_profesora?: number;
}

export interface ItemEstadisticaPlan {
  id_plan: number;
  nombre: string;
  tipo: TipoPlan;
  actividad_exclusiva: {
    id_actividad: number;
    nombre: string;
  } | null;
  cantidad_alumnos: number;
  porcentaje: number;
  precio_vigente: number | null;
  ingreso_estimado: number;
}

export interface EstadisticasPlanes {
  resumen: {
    total_alumnos_activos: number;
    ingreso_estimado_total: number;
    total_planes: number;
  };
  planes: ItemEstadisticaPlan[];
}

// ============================================================
// 4. ESTADÍSTICAS DE INSCRIPTOS POR MES (US-35)
// ============================================================

export interface FiltroInscripciones {
  desde?: Date;
  hasta?: Date;
  anio?: number;
  id_plan?: number;
  id_profesora?: number;
}

export interface ItemEstadisticaMes {
  mes: number;
  anio: number;
  nombre_mes: string;
  cantidad: number;
  diferencia_mes_anterior: number | null;
  porcentaje_variacion: number | null;
}

export interface EstadisticasInscripciones {
  periodo: {
    desde: string;
    hasta: string;
    anio: number | null;
  };
  resumen: {
    total_altas: number;
    promedio_mensual: number;
    mes_pico: {
      mes: number;
      anio: number;
      nombre_mes: string;
      cantidad: number;
    } | null;
  };
  meses: ItemEstadisticaMes[];
}
