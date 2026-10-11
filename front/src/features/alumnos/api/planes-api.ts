import { apiClient } from "@/api/client";
import type { Plan } from "@/types/plan";

export async function listarPlanes(soloActivos = true): Promise<Plan[]> {
  const { data } = await apiClient.get<Plan[]>("/planes", {
    params: { incluirBajas: (!soloActivos).toString() },
  });
  return data;
}
