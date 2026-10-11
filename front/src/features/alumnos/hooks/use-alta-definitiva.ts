import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listarPreInscripcionesPendientes,
  registrarPrimerPagoEnEfectivo,
  registrarTransferenciaRecibida,
} from "@/features/alumnos/api/alta-definitiva-api";
import { ALUMNOS_QUERY_KEY } from "@/features/alumnos/hooks/use-ficha-alumno";
import type { CuerpoPrimerPago } from "@/features/alumnos/schemas/primer-pago";

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

function registrarPrimerPago(pago: CuerpoPrimerPago): Promise<void> {
  return pago.formaPago === "EFECTIVO"
    ? registrarPrimerPagoEnEfectivo(pago.cuerpo)
    : registrarTransferenciaRecibida(pago.cuerpo);
}

// El alumno pasa a ACTIVO: cambia su ficha, el listado y esta lista. Se invalida todo "alumnos".
export function useConfirmarAltaDefinitiva() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: registrarPrimerPago,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ALUMNOS_QUERY_KEY }),
  });
}
