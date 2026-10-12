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
