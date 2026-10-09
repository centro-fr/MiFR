import type { estado_inscripcion, inscripciones, motivo_baja, Prisma } from "@prisma/client";

export type Inscripcion = inscripciones;
export type EstadoInscripcion = estado_inscripcion;
export type MotivoBaja = motivo_baja;

export const INCLUIR_DATOS_INSCRIPCION = {
  alumno: {
    select: {
      id_alumno: true,
      estado: true,
      // Quién es el alumno y quién su tutor: los únicos que pueden informar sus pagos (US-16).
      id_usuario: true,
      id_usuario_responsable: true,
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

export type InscripcionConDatos = Prisma.inscripcionesGetPayload<{
  include: typeof INCLUIR_DATOS_INSCRIPCION;
}>;

// fecha_baja de la inscripción es TIMESTAMP (el instante, en UTC) y las vigencias de
// inscripcion_horarios son DATE (el día de Argentina, ver fecha-argentina.ts).
export interface FechasDeBaja {
  instante: Date;
  dia: Date;
}

export interface FiltroInscripciones {
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
