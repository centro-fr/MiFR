import { useBandejaPorVerificar } from "@/features/por-verificar/hooks/use-bandeja-por-verificar";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { ContadoresMenu } from "./use-owner-navigation";

/**
 * Número del ítem "Por verificar" de la propietaria: transferencias por verificar y altas nuevas que
 * esperan su pago, sin contar dos veces la primera cuota informada por transferencia (issue #49).
 */
export function useContadoresMenu(): ContadoresMenu {
  const { hasRole, hasPermission } = usePermissions();
  const { items } = useBandejaPorVerificar({ enabled: hasRole("PROPIETARIA") && hasPermission("PAGOS_CONFIRMAR") });
  return { POR_VERIFICAR: items.length > 0 ? items.length : undefined };
}
