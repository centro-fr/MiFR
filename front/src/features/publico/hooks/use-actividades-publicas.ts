import { useQuery } from "@tanstack/react-query";
import { consultarActividadesPublicas } from "@/features/publico/api/actividades-api";

export const ACTIVIDADES_PUBLICAS_QUERY_KEY = ["publico", "actividades"] as const;

// Las actividades cambian poco y el back deja reusar la respuesta: la franja y la sección comparten
// esta consulta, que se pide una vez por visita.
const CINCO_MINUTOS_MS = 5 * 60_000;

export function useActividadesPublicas() {
  return useQuery({
    queryKey: ACTIVIDADES_PUBLICAS_QUERY_KEY,
    queryFn: consultarActividadesPublicas,
    staleTime: CINCO_MINUTOS_MS,
  });
}
