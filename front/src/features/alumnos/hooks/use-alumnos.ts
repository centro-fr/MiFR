import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listarAlumnos, type FiltroListarAlumnos } from "../api/alumnos-api";

export const ALUMNOS_QUERY_KEY = ["alumnos"] as const;

export function useAlumnos(filtros?: FiltroListarAlumnos) {
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, filtros],
    queryFn: () => listarAlumnos(filtros),
    staleTime: 30_000,
  });
}

export function useInvalidarAlumnos() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["inscripciones"] }),
      queryClient.invalidateQueries({ queryKey: ["horarios"] }),
    ]);
}
