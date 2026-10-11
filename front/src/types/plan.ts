export type TipoPlan = "MENSUAL" | "CLASE_SUELTA";

export interface PrecioPlan {
  id_precio: number;
  precio: number;
  fecha_vigencia_desde: string;
  fecha_vigencia_hasta: string | null;
}

export interface PlanActividadExclusiva {
  id_actividad: number;
  nombre: string;
  modalidad: "GRUPAL" | "PERSONALIZADA";
}

export interface Plan {
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
