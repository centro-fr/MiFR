import type { DatosHonorarios, ResultadoHonorarios } from "../calculador-honorarios.types.js";

// Interfaz provista por CalculadorHonorarios (Calculos del negocio, capa no persistente). La usa
// Liquidacion para armar los detalles de cada profesora. Es un cálculo puro: recibe todo lo que
// necesita y no lee la base.
//
// Lo que se espera (US-23 y SPRINT-4.md):
// - Una línea ALUMNO_A_CARGO por inscripción recibida, asista o no el alumno. Las sin_cargo y las
//   PREINSCRIPTA no generan honorarios. Qué inscripciones "estuvieron activas" en el período lo decide
//   quien llama: acá llegan ya elegidas.
// - La tarifa que aplica es la vigente al día de la línea: el fin del período, o el día de la baja si fue
//   antes. En CLASE_SUPLIDA y DESCUENTO_AUSENCIA, el día de la clase. La del plan gana a la de todos los planes.
// - MONTO_FIJO paga el valor entero, sin prorrateo. PORCENTAJE aplica el valor sobre lo cobrado de esa
//   inscripción en el período, redondeado al centavo.
// - Cada clase suplida suma a la suplente y resta a la ausente, a la tarifa HORA_SUPLENCIA de la suplente
//   por las horas de la clase. PORCENTAJE no tiene base en ese concepto: no se aplica y se advierte.
// - Sin tarifa vigente, la línea no se genera y se informa como advertencia.
export interface ICalculoHonorarios {
  calcular(datos: DatosHonorarios): ResultadoHonorarios;
}
