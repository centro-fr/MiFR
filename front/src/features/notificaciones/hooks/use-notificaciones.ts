import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  actualizarParametro,
  listarMisNotificaciones,
  listarParametros,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  obtenerResumenDiario,
} from "@/features/notificaciones/api/notificaciones-api";

export const RESUMEN_DIARIO_QUERY_KEY = ["resumen-diario"] as const;
export const PARAMETROS_QUERY_KEY = ["parametros"] as const;
export const MIS_NOTIFICACIONES_QUERY_KEY = ["notificaciones", "mias"] as const;

// La bandeja pagina de a 20, lo mismo que el back por defecto; la campana muestra las primeras.
export const NOTIFICACIONES_EN_LA_CAMPANA = 5;
export const NOTIFICACIONES_POR_PAGINA = 20;

// Junta transferencias, efectivo y cuotas: cambia a lo largo del día.
const UN_MINUTO = 60_000;
// Los avisos nacen solos (el intervalo del back), sin que nadie los cargue: hay que volver a preguntar.
const DOS_MINUTOS = 2 * 60_000;
// La configuración cambia muy poco.
const CINCO_MINUTOS = 5 * 60_000;

export function useMisNotificaciones(limit: number, offset = 0) {
  return useQuery({
    queryKey: [...MIS_NOTIFICACIONES_QUERY_KEY, { limit, offset }],
    queryFn: () => listarMisNotificaciones({ limit, offset }),
    // Al cambiar de página se sigue viendo la anterior hasta que llega la nueva.
    placeholderData: keepPreviousData,
    refetchInterval: DOS_MINUTOS,
    refetchOnWindowFocus: true,
  });
}

// La campana y la bandeja leen las mismas notificaciones: las dos se vuelven a pedir, también si
// marcar falló (por ejemplo, un 404 de una que ya no está), para mostrar lo que quedó en el back.
function useRefrescarNotificaciones() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: MIS_NOTIFICACIONES_QUERY_KEY });
}

export function useMarcarNotificacionLeida() {
  const refrescar = useRefrescarNotificaciones();
  return useMutation({ mutationFn: marcarNotificacionLeida, onSettled: refrescar });
}

export function useMarcarTodasLeidas() {
  const refrescar = useRefrescarNotificaciones();
  return useMutation({ mutationFn: marcarTodasLeidas, onSettled: refrescar });
}

export function useResumenDiario() {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: RESUMEN_DIARIO_QUERY_KEY,
    queryFn: async () => {
      const resumen = await obtenerResumenDiario();
      // Pedir el resumen genera la notificación del día (desde HORA_RESUMEN_DIARIO): la campana la
      // muestra sin esperar a su próxima consulta.
      void queryClient.invalidateQueries({ queryKey: MIS_NOTIFICACIONES_QUERY_KEY });
      return resumen;
    },
    staleTime: UN_MINUTO,
  });
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
