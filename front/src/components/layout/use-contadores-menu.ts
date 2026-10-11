import { usePreInscripcionesPendientes } from "@/features/alumnos/hooks/use-alta-definitiva";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { ContadoresMenu } from "./use-owner-navigation";

/**
 * Números del menú de la propietaria. Solo se consultan si la sesión puede abrir la pantalla
 * (misma guardia que su ruta): así no se pide nada que el back respondería con 403.
 */
export function useContadoresMenu(): ContadoresMenu {
  const { hasRole, hasPermission } = usePermissions();
  const { data: pendientes } = usePreInscripcionesPendientes({
    enabled: hasRole("PROPIETARIA") && hasPermission("ALUMNOS_VER"),
  });
  return { PENDIENTES_DE_ALTA: pendientes?.length };
}
