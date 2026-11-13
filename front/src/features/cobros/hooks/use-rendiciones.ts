import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  obtenerEfectivoPendiente,
  obtenerHistorialRendiciones,
  rendirCobroIndividual,
  rendirLote,
  type FiltrosEfectivoPendiente,
  type FiltrosHistorialRendiciones,
  type RendirLoteInput,
} from "../api/rendiciones-api";

export const EFECTIVO_PENDIENTE_QUERY_KEY = ["pagos", "efectivo-pendiente"];
export const HISTORIAL_RENDICIONES_QUERY_KEY = ["pagos", "rendiciones"];

export function useEfectivoPendiente(
  filtros?: FiltrosEfectivoPendiente,
  opciones?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...EFECTIVO_PENDIENTE_QUERY_KEY, filtros],
    queryFn: () => obtenerEfectivoPendiente(filtros),
    enabled: opciones?.enabled,
  });
}

export function useHistorialRendiciones(
  filtros?: FiltrosHistorialRendiciones,
  opciones?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: [...HISTORIAL_RENDICIONES_QUERY_KEY, filtros],
    queryFn: () => obtenerHistorialRendiciones(filtros),
    enabled: opciones?.enabled,
  });
}

export function useRendirCobro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idPago, observaciones }: { idPago: number; observaciones?: string }) =>
      rendirCobroIndividual(idPago, observaciones),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EFECTIVO_PENDIENTE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORIAL_RENDICIONES_QUERY_KEY });
    },
  });
}

export function useRendirLote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: RendirLoteInput) => rendirLote(datos),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: EFECTIVO_PENDIENTE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: HISTORIAL_RENDICIONES_QUERY_KEY });
    },
  });
}
