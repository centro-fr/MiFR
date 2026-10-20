import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  calcularLiquidaciones,
  cerrarLiquidacion,
  listarTarifas,
  marcarLiquidacionAbonada,
  obtenerInforme,
  obtenerLiquidacion,
  registrarTarifa,
} from "@/features/honorarios/api/honorarios-api";
import type { RegistrarTarifaBody } from "@/features/honorarios/schemas/honorarios";
import type { LiquidacionDetalle } from "@/types/honorarios";

export const HONORARIOS_QUERY_KEY = ["honorarios"] as const;
const LIQUIDACIONES_KEY = [...HONORARIOS_QUERY_KEY, "liquidacion"] as const;
const TARIFAS_KEY = [...HONORARIOS_QUERY_KEY, "tarifas"] as const;

const informeKey = (periodo: string) => [...HONORARIOS_QUERY_KEY, "informe", periodo] as const;
const liquidacionKey = (id: number) => [...LIQUIDACIONES_KEY, id] as const;

// Cambia cuando se recalcula o llega un cobro: dato dinámico. Las tarifas cambian poco.
const TREINTA_SEGUNDOS = 30_000;
const CINCO_MINUTOS = 5 * 60_000;

// Sin placeholderData al cambiar de mes: mostrar los montos de octubre bajo "Septiembre" mientras
// carga sería engañoso en un informe de dinero. Se ve el esqueleto.
export function useInformeHonorarios(periodo: string) {
  return useQuery({ queryKey: informeKey(periodo), queryFn: () => obtenerInforme(periodo), staleTime: TREINTA_SEGUNDOS });
}

/** El detalle se pide recién al abrir la tarjeta: la grilla se arma con un solo pedido. */
export function useLiquidacion(id: number, enabled: boolean) {
  return useQuery({
    queryKey: liquidacionKey(id),
    queryFn: () => obtenerLiquidacion(id),
    staleTime: TREINTA_SEGUNDOS,
    enabled,
  });
}

export function useTarifas() {
  return useQuery({ queryKey: TARIFAS_KEY, queryFn: listarTarifas, staleTime: CINCO_MINUTOS });
}

/**
 * Para exportar hacen falta todos los detalles: se piden en paralelo y se reutilizan los que ya
 * estaban en caché (los de las tarjetas abiertas).
 */
export function useCargarDetalles() {
  const queryClient = useQueryClient();
  return useCallback(
    (ids: number[]): Promise<LiquidacionDetalle[]> =>
      Promise.all(
        ids.map((id) =>
          queryClient.fetchQuery({ queryKey: liquidacionKey(id), queryFn: () => obtenerLiquidacion(id), staleTime: TREINTA_SEGUNDOS }),
        ),
      ),
    [queryClient],
  );
}

export function useCalcularLiquidaciones(periodo: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => calcularLiquidaciones(periodo),
    onSuccess: ({ informe }) => {
      queryClient.setQueryData(informeKey(periodo), informe);
      // Los ids de los borradores pueden cambiar al recalcular: los detalles guardados ya no sirven.
      void queryClient.invalidateQueries({ queryKey: LIQUIDACIONES_KEY });
    },
  });
}

function useCambioDeEstado(periodo: string, cambiar: (id: number) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cambiar,
    onSuccess: (_resultado, id) => {
      void queryClient.invalidateQueries({ queryKey: informeKey(periodo) });
      void queryClient.invalidateQueries({ queryKey: liquidacionKey(id) });
    },
  });
}

export function useCerrarLiquidacion(periodo: string) {
  return useCambioDeEstado(periodo, cerrarLiquidacion);
}

export function useMarcarLiquidacionAbonada(periodo: string) {
  return useCambioDeEstado(periodo, marcarLiquidacionAbonada);
}

export function useRegistrarTarifa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cuerpo: RegistrarTarifaBody) => registrarTarifa(cuerpo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TARIFAS_KEY }),
  });
}
