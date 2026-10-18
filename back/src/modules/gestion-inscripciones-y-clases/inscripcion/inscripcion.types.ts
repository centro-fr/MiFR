import type { estado_inscripcion, inscripciones, motivo_baja, Prisma } from "@prisma/client";
import type { Paginacion } from "../../../shared/utils/esquemas-paginacion.js";

export type Inscripcion = inscripciones;
export type EstadoInscripcion = estado_inscripcion;
export type MotivoBaja = motivo_baja;

export const INCLUIR_DATOS_INSCRIPCION = {
  alumno: {
    select: {
      id_alumno: true,
      estado: true,
      usuario: { select: { nombre: true, apellido: true } },
    },
  },
  plan: true,
  plan_precio: true,
  profesora: { include: { usuario: { select: { nombre: true, apellido: true } } } },
  horarios: {
    include: {
      horario: {
        include: {
          actividad: true,
          profesora: { include: { usuario: { select: { nombre: true, apellido: true } } } },
        },
      },
    },
    orderBy: { fecha_desde: "asc" },
  },
} satisfies Prisma.inscripcionesInclude;

// La inscripción como la devuelve la base, antes de sumarle la reserva.
export type InscripcionGuardada = Prisma.inscripcionesGetPayload<{
  include: typeof INCLUIR_DATOS_INSCRIPCION;
}>;

// Hasta qué día una pre-inscripción sin pagar guarda su lugar (DIAS_RESERVA_PREINSCRIPCION después del
// inicio). Se calcula al responder y no se guarda, porque depende del parámetro y del día de hoy.
export interface ReservaDeCupo {
  vence: Date;
  vencida: boolean;
}

// reserva es null salvo en las PREINSCRIPTA: una inscripción activa o dada de baja no reserva nada.
export type InscripcionConDatos = InscripcionGuardada & { reserva: ReservaDeCupo | null };

export interface Preinscripcion {
  id_alumno: number;
  id_inscripcion: number;
}

// Lo que necesita el cobro: la inscripción y quiénes son el alumno y su tutor, los únicos que pueden
// informar sus pagos (US-16). Va aparte de INCLUIR_DATOS_INSCRIPCION para no mandar esos ids en las
// respuestas de inscripciones.
export const INCLUIR_DATOS_COBRO = {
  alumno: {
    select: {
      id_alumno: true,
      estado: true,
      id_usuario: true,
      id_usuario_responsable: true,
      usuario: { select: { nombre: true, apellido: true } },
    },
  },
} satisfies Prisma.inscripcionesInclude;

export type InscripcionACobrar = Prisma.inscripcionesGetPayload<{ include: typeof INCLUIR_DATOS_COBRO }>;

// fecha_baja de la inscripción es TIMESTAMP (el instante, en UTC) y las vigencias de
// inscripcion_horarios son DATE (el día de Argentina, ver fecha-argentina.ts).
export interface FechasDeBaja {
  instante: Date;
  dia: Date;
}

export interface FiltroInscripciones extends Partial<Paginacion> {
  id_alumno?: number;
  id_plan?: number;
  id_profesora?: number;
  id_actividad?: number;
  estado?: EstadoInscripcion;
}

export interface FiltroAlumnosPorInscripcion {
  id_plan?: number;
  id_profesora?: number;
  id_actividad?: number;
}

export interface ResumenInscripcionAlumno {
  id_alumno: number;
  id_inscripcion: number;
  estado: EstadoInscripcion;
  id_plan: number;
  nombre_plan: string;
  id_profesora: number;
  nombre_profesora: string;
  ids_horarios: number[];
}

// Un inscripto en la lista de asistencia de un horario (US-20).
export interface InscriptoDeHorario {
  id_inscripcion: number;
  id_alumno: number;
  alumno: { usuario: { nombre: string; apellido: string } };
}

// Una inscripción que estuvo a cargo de su profesora en algún día de un período, para la liquidación
// de honorarios (US-23). fecha_baja es el instante de la baja; null si sigue activa.
export interface InscripcionACargo {
  id_inscripcion: number;
  id_alumno: number;
  id_profesora: number;
  id_plan: number;
  sin_cargo: boolean;
  // ACTIVA o BAJA: una PREINSCRIPTA nunca estuvo a cargo.
  estado: EstadoInscripcion;
  fecha_inicio: Date;
  fecha_baja: Date | null;
}
