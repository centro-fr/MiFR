import { apiClient } from "@/api/client";
import { panelDisponibilidadSchema, type PanelDisponibilidad } from "@/features/publico/schemas/disponibilidad";

// Endpoint público: el back no pide token. Si hay sesión, el interceptor igual lo manda y no molesta.
export async function consultarDisponibilidad(): Promise<PanelDisponibilidad> {
  const { data } = await apiClient.get("/publico/disponibilidad");
  return panelDisponibilidadSchema.parse(data);
}
