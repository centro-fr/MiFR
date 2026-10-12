import type { ModalidadActividad } from "@/types/actividad";

// Plan como lo usa la interfaz (US-11). Sale de PlanApi (features/planes/schemas).

/** MENSUAL vence por mes; CLASE_SUELTA cubre un solo día. No se cambia después de crear el plan. */
export type TipoPlan = "MENSUAL" | "CLASE_SUELTA";

export interface ActividadDelPlan {
  id: string;
  nombre: string;
  modalidad: ModalidadActividad;
}

export interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  tipo: TipoPlan;
  /** null = pase libre (o clase suelta, que no tiene frecuencia). */
  clasesPorSemana: number | null;
  diasGracia: number;
  /** null = sirve para cualquier actividad. */
  actividad: ActividadDelPlan | null;
  /** El alumno toma todas sus clases con la profesora a cargo de la inscripción. */
  profesoraUnica: boolean;
  /** null solo si el plan todavía no tiene un precio que rija hoy. */
  precioVigente: number | null;
  /** Fecha desde la que rige el precio vigente. */
  precioVigenteDesde: string | null;
  /** Aumento ya cargado que todavía no rige (US-12). */
  precioProgramado: { precio: number; desde: string } | null;
  /** Timestamp ISO de la baja; null si está vigente. */
  fechaBaja: string | null;
}

// ---------- Respuesta cruda de GET /planes ----------
// La usa la pre-inscripción (US-05) sin mapear: los campos tal como los manda el back.

export interface PrecioPlan {
  id_precio: number;
  precio: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
}

export interface PrecioPlanHistorial {
  id_plan_precio: number;
  id_plan: number;
  precio: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
}

export interface PlanActividadExclusiva {
  id_actividad: number;
  nombre: string;
  modalidad: "GRUPAL" | "PERSONALIZADA";
}

export interface PlanApiRespuesta {
  id_plan: number;
  tipo: TipoPlan;
  nombre: string;
  descripcion: string | null;
  clases_por_semana: number | null;
  dias_gracia: number;
  id_actividad_exclusiva: number | null;
  profesora_unica: boolean;
  activo: boolean;
  actividad_exclusiva?: PlanActividadExclusiva | null;
  precio_vigente: PrecioPlan | null;
  precio_programado?: PrecioPlan | null;
}
