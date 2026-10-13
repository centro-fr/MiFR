import { usePreInscripcionesPendientes } from "@/features/alumnos/hooks/use-alta-definitiva";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useTransferencias } from "@/features/transferencias/hooks/use-transferencias";
import type { ContadoresMenu } from "./use-owner-navigation";

/**
 * Números del menú de la propietaria. Solo se consultan si la sesión puede abrir la pantalla
 * (misma guardia que su ruta): así no se pide nada que el back respondería con 403.
 */
export function useContadoresMenu(): ContadoresMenu {
  const { hasRole, hasPermission } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const { data: pendientes } = usePreInscripcionesPendientes({
    enabled: esPropietaria && hasPermission("ALUMNOS_VER"),
  });
  const { data: transferencias } = useTransferencias("PENDIENTE", {
    enabled: esPropietaria && hasPermission("PAGOS_CONFIRMAR"),
  });
  return { PENDIENTES_DE_ALTA: pendientes?.length, TRANSFERENCIAS_PENDIENTES: transferencias?.length };
}
