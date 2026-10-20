import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { useTransferencias } from "@/features/transferencias/hooks/use-transferencias";
import type { ContadoresMenu } from "./use-owner-navigation";

/**
 * Alerta del menú de Cobros y Cuotas de la propietaria.
 * Se activa con transferencias por verificar o rendición de efectivo pendiente.
 */
export function useContadoresMenu(): ContadoresMenu {
  const { hasRole, hasPermission } = usePermissions();
  const esPropietaria = hasRole("PROPIETARIA");
  const { data: transferencias } = useTransferencias("PENDIENTE", {
    enabled: esPropietaria && hasPermission("PAGOS_CONFIRMAR"),
  });

  const transferenciasPorVerificar = transferencias?.length ?? 0;
  // Rendición de efectivo de profesoras: para el próximo sprint
  const rendicionEfectivoPendiente = 0;

  const totalAlertas = transferenciasPorVerificar + rendicionEfectivoPendiente;

  return {
    TRANSFERENCIAS_PENDIENTES: totalAlertas > 0 ? totalAlertas : undefined,
  };
}
