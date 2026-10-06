import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarActividad,
  crearActividad,
  darDeBajaActividad,
  listarActividades,
} from "@/features/actividades/api/actividades-api";
import type { ActividadFormData } from "@/features/actividades/schemas/actividad";

export const ACTIVIDADES_QUERY_KEY = ["actividades"] as const;

// El catálogo cambia poco: se reutiliza unos minutos entre pantallas (actividades y horarios).
export function useActividades() {
  return useQuery({
    queryKey: ACTIVIDADES_QUERY_KEY,
    queryFn: listarActividades,
    staleTime: 5 * 60_000,
  });
}

function useInvalidarActividades() {
  const queryClient = useQueryClient();
  // Los horarios traen embebida la actividad: también quedan desactualizados.
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ACTIVIDADES_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ["horarios"] }),
    ]);
}

export function useCrearActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: (datos: ActividadFormData) => crearActividad(datos),
    onSuccess: invalidar,
  });
}

export function useActualizarActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: ({ id, datos }: { id: string; datos: ActividadFormData }) => actualizarActividad(id, datos),
    onSuccess: invalidar,
  });
}

export function useDarDeBajaActividad() {
  const invalidar = useInvalidarActividades();
  return useMutation({
    mutationFn: (id: string) => darDeBajaActividad(id),
    onSuccess: invalidar,
  });
}
