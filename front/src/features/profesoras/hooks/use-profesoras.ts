import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  crearProfesora,
  darDeBajaProfesora,
  listarProfesoras,
} from "@/features/profesoras/api/profesoras-api";
import type { CrearProfesoraInput, Profesora } from "@/features/profesoras/schemas/profesora";

export const PROFESORAS_QUERY_KEY = ["profesoras"] as const;

export function useProfesoras() {
  return useQuery<Profesora[]>({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
  });
}

export function useCrearProfesora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearProfesoraInput) => crearProfesora(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
    },
  });
}

export function useDarDeBajaProfesora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => darDeBajaProfesora(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
    },
  });
}
