import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { listarAsistenciasAlumno } from "../api/asistencias-api";
import type { FiltroAsistencia } from "../schemas/asistencia-alumno";

// Cambiar de página o de filtro conserva la página anterior mientras llega la nueva: la tabla no salta.
export function useAsistenciasAlumno(idAlumno: number, filtro: FiltroAsistencia, pagina: number) {
  return useQuery({
    queryKey: ["alumnos", idAlumno, "asistencias", filtro, pagina],
    queryFn: () => listarAsistenciasAlumno(idAlumno, filtro, pagina),
    enabled: idAlumno > 0,
    placeholderData: keepPreviousData,
  });
}
