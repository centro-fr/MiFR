import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  informarTransferencia,
  listarMisTransferencias,
  obtenerMiPlan,
} from "../api/transferencias-api";
import type { InformarTransferenciaFormData } from "../schemas/transferencia";

export const MI_PLAN_QUERY_KEY = ["mi-plan"] as const;
export const MIS_TRANSFERENCIAS_QUERY_KEY = ["mis-transferencias"] as const;

export function useMiPlan() {
  return useQuery({
    queryKey: MI_PLAN_QUERY_KEY,
    queryFn: obtenerMiPlan,
    staleTime: 60_000,
  });
}

export function useMisTransferencias() {
  return useQuery({
    queryKey: MIS_TRANSFERENCIAS_QUERY_KEY,
    queryFn: listarMisTransferencias,
    staleTime: 30_000,
  });
}

export function useInformarTransferencia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (datos: InformarTransferenciaFormData) => informarTransferencia(datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MI_PLAN_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MIS_TRANSFERENCIAS_QUERY_KEY });
    },
  });
}
