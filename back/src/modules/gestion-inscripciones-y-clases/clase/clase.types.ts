import type { estado_clase, Prisma } from "@prisma/client";

export type EstadoClase = estado_clase;

export const INCLUIR_DATOS_CLASE = {
  horario: {
    include: {
      actividad: true,
      profesora: { include: { usuario: { select: { nombre: true, apellido: true } } } },
    },
  },
} satisfies Prisma.clasesInclude;

export type ClaseConDatos = Prisma.clasesGetPayload<{ include: typeof INCLUIR_DATOS_CLASE }>;

// Lo que hace falta de un horario para materializar su clase del día.
export interface HorarioDeClase {
  id_horario: number;
  id_profesora: number;
}

// Una clase cubierta por una suplente (US-24), con lo que necesita la liquidación de honorarios
// (US-23): a quién se le suma, a quién se le descuenta y cuánto duró.
export interface ClaseSuplida {
  id_clase: number;
  id_horario: number;
  fecha_clase: Date;
  hora_inicio: Date;
  hora_fin: Date;
  id_prof_suplente: number;
  id_prof_ausente: number;
}
