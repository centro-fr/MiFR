import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  informarTransferenciaPrimerPago,
  listarPreInscripcionesPendientes,
  registrarPrimerPagoEnEfectivo,
  registrarTransferenciaRecibida,
} from "@/features/alumnos/api/alta-definitiva-api";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-alumnos";
import type { CuerpoPrimerPago } from "@/features/alumnos/schemas/primer-pago";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

// Cuelga de "alumnos": una baja o un alta desde la ficha también refresca esta lista.
export const PENDIENTES_DE_ALTA_QUERY_KEY = [...ALUMNOS_QUERY_KEY, "pendientes-de-alta"] as const;

// La comparten la pantalla y el contador del menú: una sola consulta en caché para las dos.
export function usePreInscripcionesPendientes({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: PENDIENTES_DE_ALTA_QUERY_KEY,
    queryFn: listarPreInscripcionesPendientes,
    staleTime: 30_000,
    enabled,
  });
}

// El alumno pasa a ACTIVO (si se confirmó) o queda la transferencia pendiente (si es profesora).
export function useConfirmarAltaDefinitiva() {
  const queryClient = useQueryClient();
  const { hasRole, hasPermission } = usePermissions();
  const puedeConfirmarTransferencia = hasRole("PROPIETARIA") && hasPermission("PAGOS_CONFIRMAR");

  return useMutation({
    mutationFn: (pago: CuerpoPrimerPago) => {
      if (pago.formaPago === "EFECTIVO") {
        return registrarPrimerPagoEnEfectivo(pago.cuerpo);
      }
      if (puedeConfirmarTransferencia) {
        return registrarTransferenciaRecibida(pago.cuerpo);
      }
      return informarTransferenciaPrimerPago({
        id_inscripcion: pago.cuerpo.id_inscripcion,
        monto: pago.cuerpo.monto,
        fecha_hora_transferencia: pago.cuerpo.fecha_hora_transferencia,
        titular_cuenta_origen: pago.cuerpo.titular_cuenta_origen,
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
  });
}
