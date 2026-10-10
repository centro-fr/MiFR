import type { Habilitacion } from "../../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { CuotaDelHistorial } from "../cuota.types.js";

// Interfaz provista por Cuota (GestionCuotasYPagos) para que otros subsistemas sepan si un alumno
// está al día: la lista de asistencia (US-20) y el listado y la ficha de alumnos (US-10). Cuota
// junta las cuotas y los pagos de cada inscripción y le pide el estado a ICalculoHabilitacion.
// También le da a la ficha el historial de cuotas y pagos, que trae los pagos de cada cuota.
export interface IInfoCuotas {
  // Una consulta para todas las inscripciones pedidas, sin N+1. Cada inscripción que existe figura
  // en el resultado: una sin cuotas pagas sale como PENDIENTE_DE_PAGO.
  habilitacionDeInscripciones(idsInscripciones: number[]): Promise<Map<number, Habilitacion>>;

  // Solo para la propietaria (US-10): quien lo consume decide quién lo ve.
  historialDeAlumno(idAlumno: number): Promise<CuotaDelHistorial[]>;
}
