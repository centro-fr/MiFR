import { apiClient } from "@/api/client";
import {
  paginaAsistenciasAlumnoSchema,
  type FiltroAsistencia,
  type PaginaAsistenciasAlumno,
} from "../schemas/asistencia-alumno";

/** De a 10, como las demás tablas de la ficha (el back pagina con el mismo tope). */
export const ASISTENCIAS_POR_PAGINA = 10;

const ASISTIO: Record<FiltroAsistencia, string | undefined> = {
  TODAS: undefined,
  PRESENTES: "true",
  AUSENTES: "false",
};

export async function listarAsistenciasAlumno(
  idAlumno: number,
  filtro: FiltroAsistencia,
  pagina: number,
): Promise<PaginaAsistenciasAlumno> {
  const { data } = await apiClient.get(`/alumnos/${idAlumno}/asistencias`, {
    params: { asistio: ASISTIO[filtro], limit: ASISTENCIAS_POR_PAGINA, offset: pagina * ASISTENCIAS_POR_PAGINA },
  });
  return paginaAsistenciasAlumnoSchema.parse(data);
}
