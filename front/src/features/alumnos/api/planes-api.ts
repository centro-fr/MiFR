import { apiClient } from "@/api/client";
import type { PlanApiRespuesta } from "@/types/plan";

export async function listarPlanes(soloActivos = true): Promise<PlanApiRespuesta[]> {
  const { data } = await apiClient.get<PlanApiRespuesta[]>("/planes", {
    params: { incluirBajas: (!soloActivos).toString() },
  });
  return data;
}
