import type { DiaSemana } from "@/types/horarios";

// US-07: un alumno pre-inscripto (inscripción PREINSCRIPTA, alumno INACTIVO) que espera su
// primer pago. Al confirmarse ese pago el back lo da de alta: no hay un "alta" aparte.

export type FormaPrimerPago = "EFECTIVO" | "TRANSFERENCIA";

export interface HorarioPreInscripcion {
  dia: DiaSemana;
  horaInicio: string;
  horaFin: string;
  actividad: string;
}

export interface TutorPreInscripcion {
  nombre: string;
  apellido: string;
  telefono: string | null;
}

/**
 * Hasta qué día la pre-inscripción guarda su lugar sin el primer pago (parámetro
 * DIAS_RESERVA_PREINSCRIPCION del back). Vencida, el alta vuelve a pedir cupo.
 */
export interface ReservaPreInscripcion {
  /** Fecha de calendario: "2026-10-14". */
  vence: string;
  vencida: boolean;
}

export interface PreInscripcionPendiente {
  idInscripcion: string;
  idAlumno: string;
  nombre: string;
  apellido: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  fechaNacimiento: string;
  tutor: TutorPreInscripcion | null;
  idPlan: string;
  idPromocion: number | null;
  nombrePlan: string;
  /**
   * Precio del plan al pre-inscribirse. El back espera el precio vigente hoy, que suele ser el
   * mismo: si cambió en el medio, responde 409 MONTO_DISTINTO.
   */
  precio: number;
  profesora: string;
  horarios: HorarioPreInscripcion[];
  /** Timestamp de la pre-inscripción (inscripciones.fecha_alta). */
  fechaPreInscripcion: string;
  reserva: ReservaPreInscripcion | null;
}
