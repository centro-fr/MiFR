import { useMemo } from "react";
import { usePreInscripcionesPendientes } from "@/features/alumnos/hooks/use-alta-definitiva";
import { armarBandeja } from "@/features/por-verificar/utils/bandeja";
import { useTransferencias } from "@/features/transferencias/hooks/use-transferencias";

/**
 * La bandeja "Por verificar": la comparten la pantalla, el dashboard y el contador del menú. Usa las
 * mismas consultas (y la misma caché) que las transferencias pendientes y las pre-inscripciones.
 */
export function useBandejaPorVerificar({ enabled = true }: { enabled?: boolean } = {}) {
  const transferencias = useTransferencias("PENDIENTE", { enabled });
  const altas = usePreInscripcionesPendientes({ enabled });

  const items = useMemo(
    () => armarBandeja(transferencias.data ?? [], altas.data ?? []),
    [transferencias.data, altas.data],
  );

  return {
    items,
    isPending: transferencias.isPending || altas.isPending,
    isError: transferencias.isError || altas.isError,
    error: transferencias.error ?? altas.error,
    isFetching: transferencias.isFetching || altas.isFetching,
    refetch: () => Promise.all([transferencias.refetch(), altas.refetch()]),
  };
}
