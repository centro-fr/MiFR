import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-alumnos";
import {
  TRANSFERENCIAS_POR_PAGINA,
  aprobarTransferencia,
  listarTransferencias,
  rechazarTransferencia,
} from "@/features/transferencias/api/transferencias-api";
import type { EstadoTransferencia, Transferencia } from "@/types/transferencia";

export const TRANSFERENCIAS_QUERY_KEY = ["transferencias"] as const;

const STALE_TIME = 30_000;

// Fuera del hook: con una función nueva en cada render, React Query volvería a aplanar y la lista
// sería otro array aunque los datos no cambien, y se perderían las memorizaciones de la pantalla.
function aplanarPaginas(datos: InfiniteData<Transferencia[]>): Transferencia[] {
  return datos.pages.flat();
}

interface OpcionesListado {
  enabled?: boolean;
  /** Solo la pantalla la pide: así el plazo de 24 horas avanza sin que el menú consulte de fondo. */
  refetchInterval?: number;
}

/**
 * Páginas de TRANSFERENCIAS_POR_PAGINA. Las pendientes las comparten la pantalla y el contador del
 * menú: misma clave, una sola consulta en caché.
 */
export function useTransferencias(estado: EstadoTransferencia, { enabled = true, refetchInterval }: OpcionesListado = {}) {
  return useInfiniteQuery({
    queryKey: [...TRANSFERENCIAS_QUERY_KEY, "listado", estado],
    queryFn: ({ pageParam }) => listarTransferencias({ estado, offset: pageParam }),
    initialPageParam: 0,
    // El back no informa el total: una página llena indica que puede haber más.
    getNextPageParam: (ultima, paginas) =>
      ultima.length === TRANSFERENCIAS_POR_PAGINA ? paginas.length * TRANSFERENCIAS_POR_PAGINA : undefined,
    select: aplanarPaginas,
    staleTime: STALE_TIME,
    enabled,
    refetchInterval,
  });
}

/** Todas las transferencias del alumno, para el historial del detalle. Se pide al abrirlo. */
export function useTransferenciasDelAlumno(idAlumno: number | undefined) {
  return useQuery({
    queryKey: [...TRANSFERENCIAS_QUERY_KEY, "alumno", idAlumno],
    queryFn: () => listarTransferencias({ idAlumno }),
    enabled: idAlumno !== undefined,
    staleTime: STALE_TIME,
  });
}

// Aprobar o rechazar cambia la cuota del alumno (US-18) y, si era su primera cuota, lo da de alta
// (US-07): se refrescan las transferencias y todo lo de alumnos.
function useInvalidarTrasResolver() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: TRANSFERENCIAS_QUERY_KEY }),
      queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
    ]);
}

export function useAprobarTransferencia() {
  const invalidar = useInvalidarTrasResolver();
  return useMutation({
    mutationFn: ({ id, confirmarMontoDistinto }: { id: number; confirmarMontoDistinto: boolean }) =>
      aprobarTransferencia(id, confirmarMontoDistinto),
    onSuccess: invalidar,
  });
}

export function useRechazarTransferencia() {
  const invalidar = useInvalidarTrasResolver();
  return useMutation({
    mutationFn: ({ id, motivo }: { id: number; motivo: string }) => rechazarTransferencia(id, motivo),
    onSuccess: invalidar,
  });
}
