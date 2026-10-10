import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { darDeBajaAlumno, obtenerFichaAlumno } from "@/features/alumnos/api/alumnos-api";
import type { MotivoBaja } from "@/types/alumno";

export const ALUMNOS_QUERY_KEY = ["alumnos"] as const;

export function fichaAlumnoQueryKey(id: string) {
  return [...ALUMNOS_QUERY_KEY, id, "ficha"] as const;
}

// Un 404 no se arregla reintentando: se corta enseguida y la página muestra "no encontrado".
function reintentarSalvo404(intentos: number, error: unknown): boolean {
  if (isAxiosError(error) && error.response?.status === 404) return false;
  return intentos < 2;
}

// Datos que cambian a menudo (estado, contacto): se refrescan al minuto.
export function useFichaAlumno(id: string) {
  return useQuery({
    queryKey: fichaAlumnoQueryKey(id),
    queryFn: () => obtenerFichaAlumno(id),
    staleTime: 60_000,
    retry: reintentarSalvo404,
  });
}

export function esAlumnoNoEncontrado(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === 404;
}

// La baja cambia el estado en la ficha y en cualquier listado: se invalida todo "alumnos".
export function useDarDeBajaAlumno() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: MotivoBaja }) => darDeBajaAlumno(id, motivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
  });
}
