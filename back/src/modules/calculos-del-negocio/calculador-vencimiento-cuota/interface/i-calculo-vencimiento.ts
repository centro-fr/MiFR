import type { DatosVencimiento } from "../calculador-vencimiento-cuota.types.js";

// Interfaz provista por CalculadorVencimientoCuota (Calculos del negocio, capa no persistente).
// La usa Cuota para guardar hasta cuándo cubre la cuota que se cobra. Es un cálculo puro: no
// lee la base ni la hora del servidor.
export interface ICalculoVencimiento {
  // MENSUAL: de fecha a fecha, el mismo día del mes siguiente (31/01 → 28 o 29/02).
  // CLASE_SUELTA: el mismo día de la clase, sin días de gracia.
  // Devuelve un DATE a las 00:00 UTC, como los guarda Prisma.
  calcularVencimiento(datos: DatosVencimiento): Date;
}
