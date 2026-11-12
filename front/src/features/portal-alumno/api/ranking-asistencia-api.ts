import { apiClient } from "@/api/client";
import { rankingAsistenciaSchema, type RankingAsistencia } from "../schemas/ranking-asistencia";

export interface FiltrosRankingAsistencia {
  desde?: string;
  hasta?: string;
  limit?: number;
  offset?: number;
}

export async function obtenerRankingAsistencia(filtros: FiltrosRankingAsistencia = {}): Promise<RankingAsistencia> {
  const { data } = await apiClient.get("/reportes/ranking-asistencia", {
    params: { limit: 100, ...filtros },
  });
  return rankingAsistenciaSchema.parse(data);
}
