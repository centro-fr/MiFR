import { useQuery } from "@tanstack/react-query";
import { listarAsistenciasAlumno } from "../api/asistencias-api";

export function useAsistenciasAlumno(idAlumno?: number) {
  return useQuery({
    queryKey: ["alumnos", idAlumno, "asistencias"],
    queryFn: () => listarAsistenciasAlumno(idAlumno!),
    enabled: Boolean(idAlumno && idAlumno > 0),
  });
}
