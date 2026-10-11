import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarAlumno,
  listarAlumnos,
  obtenerAlumno,
  type FiltrosAlumnos,
} from "@/features/alumnos/api/alumnos-api";
import type { ActualizarAlumnoInput } from "@/features/alumnos/schemas/alumno";

export const ALUMNOS_QUERY_KEY = ["alumnos"] as const;

export function useAlumnos(filtros: FiltrosAlumnos) {
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, filtros],
    queryFn: () => listarAlumnos(filtros),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useAlumno(id: number) {
  return useQuery({
    queryKey: [...ALUMNOS_QUERY_KEY, id],
    queryFn: () => obtenerAlumno(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 30_000,
  });
}

export function useActualizarAlumno(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cambios: ActualizarAlumnoInput) => actualizarAlumno(id, cambios),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: [...ALUMNOS_QUERY_KEY, id] }),
      ]);
    },
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
