import type {
  CuotaDelHistorial,
  CuotaParaAviso,
  HabilitacionDeInscripcion,
  ResumenCuotasVencidas,
} from "../cuota.types.js";

// Interfaz provista por Cuota (GestionCuotasYPagos) para que otros subsistemas sepan si un alumno
// está al día: la lista de asistencia (US-20) y el listado y la ficha de alumnos (US-10). Cuota
// junta las cuotas y los pagos de cada inscripción y le pide el estado a ICalculoHabilitacion.
// También le da a la ficha el historial de cuotas y pagos, que trae los pagos de cada cuota.
export interface IInfoCuotas {
  // Una consulta para todas las inscripciones pedidas, sin N+1. Cada inscripción que existe figura
  // en el resultado: una sin cuotas pagas sale como PENDIENTE_DE_PAGO. Una dada de baja se calcula al
  // día de su baja: muestra lo que debía al irse (US-08), sin un atraso que siga creciendo.
  habilitacionDeInscripciones(idsInscripciones: number[]): Promise<Map<number, HabilitacionDeInscripcion>>;

  // Solo para la propietaria (US-10): quien lo consume decide quién lo ve.
  historialDeAlumno(idAlumno: number): Promise<CuotaDelHistorial[]>;

  // Si el alumno tuvo alguna vez un pago confirmado, en cualquiera de sus inscripciones: la
  // reactivación de quien nunca pagó vuelve a la pre-inscripción (US-07, US-08).
  tuvoPagoConfirmado(idAlumno: number): Promise<boolean>;

  cobradoEnPeriodo(idsInscripciones: number[], desde: Date, hasta: Date): Promise<Map<number, number>>;

  paraAvisoDeVencimiento(fecha: Date, diasPrevios: number): Promise<CuotaParaAviso[]>;

  // US-26: las inscripciones mensuales activas con la cuota vencida hoy, con lo que se estima que
  // deben al precio vigente. Para el resumen diario de la propietaria.
  resumenCuotasVencidas(hoy: Date): Promise<ResumenCuotasVencidas>;
}
