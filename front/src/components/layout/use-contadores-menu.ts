import { useEfectivoPendiente } from "@/features/cobros/hooks/use-rendiciones";
import { useBandejaPorVerificar } from "@/features/por-verificar/hooks/use-bandeja-por-verificar";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { ContadoresMenu } from "./use-owner-navigation";

/**
 * Contadores de alertas del menú de la propietaria:
 * - "Por verificar": transferencias por verificar y altas nuevas que esperan su pago (issue #49).
 * - "Efectivo a rendir": cobros en efectivo en mano de las profesoras pendientes de rendición.
 */
export function useContadoresMenu(): ContadoresMenu {
  const { hasRole, hasPermission } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const { items } = useBandejaPorVerificar({
    enabled: esPropietaria && hasPermission("PAGOS_CONFIRMAR"),
  });
  const { data: efectivoPendiente } = useEfectivoPendiente(undefined, {
    enabled: esPropietaria && hasPermission("PAGOS_RENDICION_VER"),
  });
  const cantidadEfectivo = efectivoPendiente?.cantidad ?? 0;

  return {
    POR_VERIFICAR: items.length > 0 ? items.length : undefined,
    EFECTIVO_A_RENDIR: cantidadEfectivo > 0 ? cantidadEfectivo : undefined,
  };
}
