import { useQuery } from "@tanstack/react-query";
import { consultarDisponibilidad } from "@/features/publico/api/disponibilidad-api";

export const DISPONIBILIDAD_QUERY_KEY = ["publico", "disponibilidad"] as const;

// US-32: los lugares libres se actualizan solos, sin recargar la página. El back deja reusar la
// respuesta un minuto, así que consultar más seguido no trae nada nuevo.
const UN_MINUTO_MS = 60_000;
const CADA_CINCO_MINUTOS_MS = 5 * UN_MINUTO_MS;

export function useDisponibilidad() {
  return useQuery({
    queryKey: DISPONIBILIDAD_QUERY_KEY,
    queryFn: consultarDisponibilidad,
    staleTime: UN_MINUTO_MS,
    refetchInterval: CADA_CINCO_MINUTOS_MS,
  });
}
