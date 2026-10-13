import { apiClient } from "@/api/client";
import { actividadesPublicasSchema, type ActividadesPublicas } from "@/features/publico/schemas/actividades";

// Endpoint público: el back no pide token. Si hay sesión, el interceptor igual lo manda y no molesta.
export async function consultarActividadesPublicas(): Promise<ActividadesPublicas> {
  const { data } = await apiClient.get("/publico/actividades");
  return actividadesPublicasSchema.parse(data);
}
