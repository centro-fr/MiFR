import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import {
  listarAlumnosInactivos,
  quitarSeguimiento,
  registrarSeguimiento,
} from "@/features/inactivos/api/inactivos-api";
import type { FiltrosAlumnosInactivos } from "@/features/inactivos/schemas/inactivos";

export const INACTIVOS_QUERY_KEY = ["informes", "alumnos-inactivos"] as const;

export function useAlumnosInactivos(filtros: FiltrosAlumnosInactivos = {}) {
  return useQuery({
    queryKey: [...INACTIVOS_QUERY_KEY, filtros],
    queryFn: () => listarAlumnosInactivos(filtros),
    staleTime: 60_000,
  });
}

export function useRegistrarSeguimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      idInscripcion,
      estado,
    }: {
      idInscripcion: number;
      estado: "CONTACTADO" | "GESTIONADO" | "IGNORADO";
    }) => registrarSeguimiento(idInscripcion, estado),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: INACTIVOS_QUERY_KEY });
      const etiquetas: Record<string, string> = {
        CONTACTADO: "Alumno marcado como contactado.",
        GESTIONADO: "Alumno marcado como gestionado.",
        IGNORADO: "Alumno marcado como ignorado.",
      };
      toast.success(etiquetas[variables.estado] ?? "Seguimiento actualizado.");
    },
    onError: (error) => {
      toast.error(mensajeDeErrorApi(error, "No se pudo actualizar el estado de seguimiento."));
    },
  });
}

export function useQuitarSeguimiento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (idInscripcion: number) => quitarSeguimiento(idInscripcion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: INACTIVOS_QUERY_KEY });
      toast.success("El alumno volvió a estado pendiente.");
    },
    onError: (error) => {
      toast.error(mensajeDeErrorApi(error, "No se pudo quitar la marca de seguimiento."));
    },
  });
}
