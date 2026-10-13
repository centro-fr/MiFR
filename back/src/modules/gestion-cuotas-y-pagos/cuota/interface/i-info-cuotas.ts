import type { CuotaDelHistorial, CuotaParaAviso, HabilitacionDeInscripcion } from "../cuota.types.js";

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

  // US-23: lo cobrado de cada inscripción en el período, para las tarifas por porcentaje. Suma los
  // pagos CONFIRMADO cuya fecha de pago cae entre desde y hasta, días de Argentina inclusive. Toda
  // inscripción pedida figura en el resultado: sin cobros, con 0.
  cobradoEnPeriodo(idsInscripciones: number[], desde: Date, hasta: Date): Promise<Map<number, number>>;

  // US-25: la cuota vigente de cada inscripción activa que pide un aviso en esa fecha (un día de
  // Argentina). CUOTA_POR_VENCER desde diasPrevios antes del vencimiento hasta el vencimiento
  // inclusive; CUOTA_VENCIDA cuando la cuota pasa a VENCIDA, terminados los días de gracia (con el
  // mismo criterio que la ficha, ICalculoHabilitacion). No avisa a un alumno dado de baja, con una
  // transferencia pendiente o con un plan de clase suelta, y solo mira la última cuota paga: si
  // renovó, la anterior ya no avisa. Devuelve la cuota mientras siga en esa situación: que no se
  // repita el aviso lo resuelve quien lo registra.
  paraAvisoDeVencimiento(fecha: Date, diasPrevios: number): Promise<CuotaParaAviso[]>;
}
