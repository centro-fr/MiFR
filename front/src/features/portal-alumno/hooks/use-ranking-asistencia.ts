import { useQuery } from "@tanstack/react-query";
import { obtenerRankingAsistencia, type FiltrosRankingAsistencia } from "../api/ranking-asistencia-api";

export const RANKING_ASISTENCIA_QUERY_KEY = ["ranking-asistencia"] as const;

export function useRankingAsistencia(filtros: FiltrosRankingAsistencia) {
  return useQuery({
    queryKey: [...RANKING_ASISTENCIA_QUERY_KEY, filtros],
    queryFn: () => obtenerRankingAsistencia(filtros),
    staleTime: 60_000,
  });
}
