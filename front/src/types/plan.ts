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
  /** Aumento ya cargado que todavía no rige (US-12). */
  precioProgramado: { precio: number; desde: string } | null;
  /** Timestamp ISO de la baja; null si está vigente. */
  fechaBaja: string | null;
}
