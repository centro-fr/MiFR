import type { Habilitacion } from "../../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";

// Interfaz provista por Cuota (GestionCuotasYPagos) para que otros subsistemas sepan si un alumno
// está al día: la lista de asistencia (US-20) y el listado y la ficha de alumnos (US-10). Cuota
// junta las cuotas y los pagos de cada inscripción y le pide el estado a ICalculoHabilitacion.
export interface IInfoCuotas {
  // Una consulta para todas las inscripciones pedidas, sin N+1. Cada id pedido figura en el
  // resultado: una inscripción sin cuotas pagas sale como PENDIENTE_DE_PAGO.
  habilitacionDeInscripciones(idsInscripciones: number[]): Promise<Map<number, Habilitacion>>;
}
