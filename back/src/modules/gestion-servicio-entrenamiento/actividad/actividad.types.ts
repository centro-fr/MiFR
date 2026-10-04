import type { actividades, modalidad_actividad } from "@prisma/client";

export type Actividad = actividades;
export type ModalidadActividad = modalidad_actividad;

export interface FiltroActividad {
  busqueda?: string;
}
