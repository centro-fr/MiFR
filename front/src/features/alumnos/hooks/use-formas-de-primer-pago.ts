import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import type { FormaPrimerPago } from "@/types/alta-definitiva";

// Como en pago.routes.ts: el efectivo lo registra quien tenga PAGOS_REGISTRAR; una transferencia
// recibida, solo la propietaria con PAGOS_CONFIRMAR. Sin ninguna, no se ofrece cobrar.
export function useFormasDePrimerPago(): FormaPrimerPago[] {
  const { hasRole, hasPermission } = usePermissions();
  const formas: FormaPrimerPago[] = [];
  if (hasPermission("PAGOS_REGISTRAR")) formas.push("EFECTIVO");
  if ((hasRole("PROPIETARIA") && hasPermission("PAGOS_CONFIRMAR")) || hasRole("PROFESORA")) {
    formas.push("TRANSFERENCIA");
  }
  return formas;
}
