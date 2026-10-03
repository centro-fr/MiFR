import { isAxiosError } from "axios";
import { apiClient } from "@/api/client";
import { matrizResponseSchema } from "@/features/seguridad/schemas/matriz";
import type { CambioPermiso, MatrizErrorCode, MatrizPermisos } from "@/types/permissions";

export async function getMatriz(): Promise<MatrizPermisos> {
  const { data } = await apiClient.get("/seguridad/matriz");
  return matrizResponseSchema.parse(data);
}

export async function putMatriz(cambios: CambioPermiso[]): Promise<void> {
  await apiClient.put("/seguridad/matriz", { cambios });
}

export function mapMatrizError(error: unknown): MatrizErrorCode {
  if (isAxiosError(error)) {
    if (!error.response) return "RED_ERROR";
    const data = error.response.data as { error?: { code?: string } } | undefined;
    const code = data?.error?.code;
    if (error.response.status === 401 || error.response.status === 403) return "SIN_PERMISO";
    if (code === "PERMISO_CRITICO_INMUTABLE" || code === "PERMISO_EXCLUSIVO_PROPIETARIA") {
      return "PERMISO_BLOQUEADO";
    }
    if (code === "VALIDATION_ERROR") return "VALIDACION_ERROR";
    return "RED_ERROR";
  }
  return "RED_ERROR";
}
