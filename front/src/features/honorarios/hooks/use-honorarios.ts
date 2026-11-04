import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
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

const tarifasQuery = { queryKey: TARIFAS_KEY, queryFn: listarTarifas, staleTime: CINCO_MINUTOS };

// El detalle identifica la tarifa aplicada solo por id: se completa con el listado de tarifas, que
// casi siempre ya está en caché por las tarjetas. Si se registró una tarifa, se vuelve a pedir.
async function detalleConTarifas(queryClient: QueryClient, id: number): Promise<LiquidacionDetalle> {
  return obtenerLiquidacion(id, await queryClient.fetchQuery(tarifasQuery));
}

// Sin placeholderData al cambiar de mes: mostrar los montos de octubre bajo "Septiembre" mientras
// carga sería engañoso en un informe de dinero. Se ve el esqueleto.
export function useInformeHonorarios(periodo: string) {
  return useQuery({ queryKey: informeKey(periodo), queryFn: () => obtenerInforme(periodo), staleTime: TREINTA_SEGUNDOS });
}

/** El detalle se pide recién al abrir la tarjeta: la grilla se arma con un solo pedido. */
export function useLiquidacion(id: number, enabled: boolean) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: liquidacionKey(id),
    queryFn: () => detalleConTarifas(queryClient, id),
    staleTime: TREINTA_SEGUNDOS,
    enabled,
  });
}

export function useTarifas() {
  return useQuery(tarifasQuery);
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
          queryClient.fetchQuery({
            queryKey: liquidacionKey(id),
            queryFn: () => detalleConTarifas(queryClient, id),
            staleTime: TREINTA_SEGUNDOS,
          }),
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

/**
 * Cierra de una vez todas las que siguen en borrador. Lo usa el cierre automático del mes: el back
 * todavía no cierra solo, así que lo dispara la pantalla al entrar pasado el día de cierre.
 */
export function useCerrarMes(periodo: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => cerrarLiquidacion(id))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: informeKey(periodo) });
      void queryClient.invalidateQueries({ queryKey: LIQUIDACIONES_KEY });
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
