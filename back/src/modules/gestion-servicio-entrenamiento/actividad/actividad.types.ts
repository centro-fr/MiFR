import type { actividades } from "@prisma/client";

export type Actividad = actividades;

export interface FiltroActividad {
  busqueda?: string;
}
