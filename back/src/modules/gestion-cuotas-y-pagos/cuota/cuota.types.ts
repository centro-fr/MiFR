import type { estado_pago, tipo_plan } from "@prisma/client";
import type { InscripcionConDatos } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";

export type EstadoPago = estado_pago;

// Las cuotas de una inscripción con el estado de sus pagos, de la más nueva a la más vieja. Es lo
// que hace falta para decidir qué cuota se cobra y si el alumno está al día.
export interface SituacionDeCuotas {
  id_inscripcion: number;
  tipo_plan: tipo_plan;
  dias_gracia: number;
  cuotas: {
    id_cuota: number;
    numero_cuota: number;
    fecha_vencimiento: Date;
    estados_pagos: EstadoPago[];
  }[];
}

// La cuota que corresponde cobrar ahora: la última, si quedó sin pagar (por ejemplo, después de
// una transferencia rechazada), o una nueva que sigue a la vigente. Monto y vencimiento se
// calculan a la fecha del cobro.
export interface CuotaACobrar {
  inscripcion: InscripcionConDatos;
  idCuotaExistente: number | null;
  numeroCuota: number;
  fechaVencimiento: Date;
  monto: number;
}
