import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarDatosProfesora,
  crearProfesora,
  darDeBajaProfesora,
  listarProfesoras,
  obtenerUsuarioDeProfesora,
  reactivarProfesora,
} from "@/features/profesoras/api/profesoras-api";
import { listarHorarios } from "@/features/horarios/api/horarios-api";
import type {
  ActualizarDatosProfesoraInput,
  CrearProfesoraInput,
  Profesora,
} from "@/features/profesoras/schemas/profesora";

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

export function useReactivarProfesora() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => reactivarProfesora(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
    },
  });
}

export function useUsuarioProfesora(idUsuario: number | null | undefined) {
  return useQuery({
    queryKey: ["usuario-profesora", idUsuario] as const,
    queryFn: () => {
      if (typeof idUsuario !== "number") throw new Error("ID de usuario no provisto");
      return obtenerUsuarioDeProfesora(idUsuario);
    },
    enabled: typeof idUsuario === "number" && Number.isInteger(idUsuario) && idUsuario > 0,
  });
}

export function useActualizarDatosProfesora(idUsuario: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: ActualizarDatosProfesoraInput) => actualizarDatosProfesora(idUsuario, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFESORAS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ["usuario-profesora", idUsuario] });
    },
  });
}

export function useHorariosActivos() {
  return useQuery({
    queryKey: ["horarios"] as const,
    queryFn: listarHorarios,
  });
}
