import { useState } from "react";
import { toast } from "sonner";
import { useConfirmarAltaDefinitiva } from "@/features/alumnos/hooks/use-alta-definitiva";
import type { CuerpoPrimerPago } from "@/features/alumnos/schemas/primer-pago";
import { useAprobarTransferencia, useRechazarTransferencia } from "@/features/transferencias/hooks/use-transferencias";
import type { PreInscripcionPendiente } from "@/types/alta-definitiva";
import type { Transferencia } from "@/types/transferencia";

/** Verificar una transferencia (US-17): aprobarla deja al alumno al día; si era su primera cuota, lo da de alta. */
export function useVerificarTransferencia() {
  const [seleccionada, setSeleccionada] = useState<Transferencia | null>(null);
  const aprobar = useAprobarTransferencia();
  const rechazar = useRechazarTransferencia();
  const nombre = (t: Transferencia) => `${t.alumno.nombre} ${t.alumno.apellido}`;

  function onAprobar(transferencia: Transferencia, confirmarMontoDistinto: boolean) {
    aprobar.mutate(
      { id: transferencia.id, confirmarMontoDistinto },
      {
        onSuccess: () => {
          setSeleccionada(null);
          toast.success("Transferencia aprobada", { description: `${nombre(transferencia)} quedó al día.` });
        },
        onError: () => toast.error("No se pudo aprobar la transferencia"),
      },
    );
  }

  function onRechazar(transferencia: Transferencia, motivo: string) {
    rechazar.mutate(
      { id: transferencia.id, motivo },
      {
        onSuccess: () => {
          setSeleccionada(null);
          toast.success("Transferencia rechazada", { description: `${nombre(transferencia)}: el motivo quedó registrado.` });
        },
        onError: () => toast.error("No se pudo rechazar la transferencia"),
      },
    );
  }

  return {
    seleccionada,
    abrir: setSeleccionada,
    cerrar: () => setSeleccionada(null),
    onAprobar,
    onRechazar,
    aprobando: aprobar.isPending,
    rechazando: rechazar.isPending,
  };
}

/** Cobrar el alta de una pre-inscripción (US-07): con el primer pago el alumno queda activo. */
export function useCobrarAlta() {
  const [seleccionada, setSeleccionada] = useState<PreInscripcionPendiente | null>(null);
  const confirmarAlta = useConfirmarAltaDefinitiva();

  function abrir(alta: PreInscripcionPendiente) {
    confirmarAlta.reset();
    setSeleccionada(alta);
  }

  function confirmar(pago: CuerpoPrimerPago) {
    if (!seleccionada) return;
    const { nombre, apellido } = seleccionada;
    confirmarAlta.mutate(pago, {
      onSuccess: () => {
        setSeleccionada(null);
        toast.success(`${nombre} ${apellido} quedó activo`);
      },
    });
  }

  return {
    seleccionada,
    abrir,
    cerrar: () => setSeleccionada(null),
    confirmar,
    confirmando: confirmarAlta.isPending,
    error: confirmarAlta.error,
  };
}
