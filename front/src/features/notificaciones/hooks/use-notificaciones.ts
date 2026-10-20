import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarParametro,
  listarParametros,
  obtenerResumenDiario,
} from "@/features/notificaciones/api/notificaciones-api";

export const RESUMEN_DIARIO_QUERY_KEY = ["resumen-diario"] as const;
export const PARAMETROS_QUERY_KEY = ["parametros"] as const;

// Junta transferencias, efectivo y cuotas: cambia a lo largo del día.
const UN_MINUTO = 60_000;
// La configuración cambia muy poco.
const CINCO_MINUTOS = 5 * 60_000;

export function useResumenDiario() {
  return useQuery({ queryKey: RESUMEN_DIARIO_QUERY_KEY, queryFn: obtenerResumenDiario, staleTime: UN_MINUTO });
}

export function useParametros() {
  return useQuery({ queryKey: PARAMETROS_QUERY_KEY, queryFn: listarParametros, staleTime: CINCO_MINUTOS });
}

export function useActualizarParametro() {
  return useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: number | string }) => actualizarParametro(clave, valor),
  });
}

/** Después de guardar (aunque falle a medias) se vuelven a pedir: la pantalla muestra lo que quedó. */
export function useRefrescarParametros() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: PARAMETROS_QUERY_KEY });
}
