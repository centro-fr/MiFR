import type { estado_pago, forma_pago, tipo_plan } from "@prisma/client";
import type { Habilitacion } from "../../calculos-del-negocio/calculador-habilitacion/calculador-habilitacion.types.js";
import type { InscripcionACobrar } from "../../gestion-inscripciones-y-clases/inscripcion/inscripcion.types.js";

export type EstadoPago = estado_pago;
export type FormaPago = forma_pago;

// Las cuotas de una inscripción con el estado de sus pagos, de la más nueva a la más vieja. Es lo
// que hace falta para decidir qué cuota se cobra y si el alumno está al día.
export interface SituacionDeCuotas {
  id_inscripcion: number;
  tipo_plan: tipo_plan;
  dias_gracia: number;
  // El instante en que se dio de baja la inscripción; null si sigue vigente.
  fecha_baja: Date | null;
  cuotas: {
    id_cuota: number;
    numero_cuota: number;
    fecha_vencimiento: Date;
    estados_pagos: EstadoPago[];
  }[];
}

export interface SituacionParaAviso extends SituacionDeCuotas {
  nombre_plan: string;
  alumno: {
    id_alumno: number;
    id_usuario: number;
    id_usuario_responsable: number | null;
    nombre: string;
    apellido: string;
  };
}

interface NombreCompleto {
  nombre: string;
  apellido: string;
}

// US-34: situación detallada con contacto para el informe de cuotas vencidas.
export interface SituacionParaInforme extends SituacionDeCuotas {
  id_plan: number;
  id_promocion: number | null;
  nombre_plan: string;
  profesora: { id_profesora: number } & NombreCompleto;
  alumno: {
    id_alumno: number;
    nombre: string;
    apellido: string;
    telefono: string | null;
    email: string | null;
  };
}

export interface CuotaVencidaDetallada {
  id_inscripcion: number;
  alumno: SituacionParaInforme["alumno"];
  plan: { id_plan: number; nombre: string };
  profesora: SituacionParaInforme["profesora"];
  fecha_vencimiento: Date;
  dias_vencida: number;
  monto_adeudado: number;
}

export type TipoAvisoCuota = "CUOTA_POR_VENCER" | "CUOTA_VENCIDA";

export interface CuotaParaAviso {
  tipo: TipoAvisoCuota;
  id_cuota: number;
  id_inscripcion: number;
  fecha_vencimiento: Date;
  // El último día de gracia: hasta entonces la cuota está por vencer.
  fin_de_gracia: Date;
  nombre_plan: string;
  alumno: SituacionParaAviso["alumno"];
}

// La habilitación de una inscripción y si tiene una transferencia sin revisar (US-16), que la
// habilitación usa pero no devuelve: la ficha la muestra para no cobrar dos veces.
export type HabilitacionDeInscripcion = Habilitacion & { tienePagoPendiente: boolean };

// Una cuota con todos sus pagos, también los rechazados, para el historial de la ficha del alumno
// (US-10). El plan sale de la inscripción, que puede no ser la vigente.
export interface CuotaDelHistorial {
  id_cuota: number;
  id_inscripcion: number;
  plan: string;
  numero_cuota: number;
  fecha_vencimiento: Date;
  monto: number;
  pagos: {
    id_pago: number;
    forma_pago: FormaPago;
    estado: EstadoPago;
    monto: number;
    fecha_pago: Date;
    motivo_rechazo: string | null;
  }[];
}

// La cuota que corresponde cobrar ahora: la última, si quedó sin pagar (por ejemplo, después de
// una transferencia rechazada), o una nueva que sigue a la vigente. Monto y vencimiento se
// calculan a la fecha del cobro.
export interface CuotaACobrar {
  inscripcion: InscripcionACobrar;
  idCuotaExistente: number | null;
  numeroCuota: number;
  fechaVencimiento: Date;
  monto: number;
}
