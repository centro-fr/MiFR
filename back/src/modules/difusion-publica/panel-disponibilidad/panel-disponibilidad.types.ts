import type { modalidad_actividad } from "@prisma/client";

// Lo que ve un visitante sin sesión: qué actividades da el centro y qué días. Ni horas, ni profesoras,
// ni cupos, ni ningún dato de alumnos: la grilla con esos datos queda para quien tiene sesión.
export interface ActividadPublica {
  id_actividad: number;
  nombre: string;
  descripcion: string | null;
  modalidad: modalidad_actividad;
  // Días de la semana con alguna clase: 1 = lunes … 6 = sábado.
  dias: number[];
  clases_por_semana: number;
}

export interface ActividadesPublicas {
  actividades: ActividadPublica[];
}
