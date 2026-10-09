import type { DatosHabilitacion, Habilitacion } from "../calculador-habilitacion.types.js";

// Interfaz provista por CalculadorHabilitacion (Calculos del negocio, capa no persistente). La usa
// Cuota para responder IInfoCuotas. Es un cálculo puro: recibe todo lo que necesita, también el
// "hoy" y la política de vencidos, y no lee la base.
//
// Lo que se espera (US-18 y las decisiones de SPRINT-3.md):
// - MENSUAL: AL_DIA hasta el vencimiento inclusive; POR_VENCER durante los días de gracia que
//   siguen; VENCIDA después. Con 0 días de gracia pasa de AL_DIA a VENCIDA.
// - CLASE_SUELTA: CLASE_SUELTA_VIGENTE el día de la clase, CLASE_SUELTA_VENCIDA desde el siguiente.
// - Sin cuota paga: PENDIENTE_DE_PAGO, que no habilita a asistir.
// - puedeAsistir: true en AL_DIA, POR_VENCER y CLASE_SUELTA_VIGENTE; en VENCIDA y
//   CLASE_SUELTA_VENCIDA lo decide vencidosPuedenAsistir, salvo que haya un pago pendiente, que
//   nunca bloquea (US-16).
export interface ICalculoHabilitacion {
  calcular(datos: DatosHabilitacion): Habilitacion;
}
