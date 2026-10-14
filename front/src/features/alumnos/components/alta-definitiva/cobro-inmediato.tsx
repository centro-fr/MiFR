import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { listarPreInscripcionesPendientes } from "@/features/alumnos/api/alta-definitiva-api";
import { ModalConfirmarAlta } from "@/features/alumnos/components/alta-definitiva/modal-confirmar-alta";
import { PENDIENTES_DE_ALTA_QUERY_KEY, useConfirmarAltaDefinitiva } from "@/features/alumnos/hooks/use-alta-definitiva";
import { useFormasDePrimerPago } from "@/features/alumnos/hooks/use-formas-de-primer-pago";

interface CobroInmediatoProps {
  /** La pre-inscripción recién creada con "Confirmar y cobrar ahora". */
  idInscripcion: number;
  /** Se cobró, se cerró sin cobrar o no se encontró la pre-inscripción. */
  onTerminar: () => void;
}

/**
 * Registro del primer cobro (US-07) justo después de pre-inscribir: el mismo modal y los mismos
 * datos que Pendientes de alta. Si se cierra sin cobrar, la pre-inscripción queda pendiente ahí.
 */
export function CobroInmediato({ idInscripcion, onTerminar }: CobroInmediatoProps) {
  const formas = useFormasDePrimerPago();
  const confirmarAlta = useConfirmarAltaDefinitiva();
  // La lista en caché es de antes de pre-inscribir: se vuelve a pedir y se espera a la nueva.
  const pendientes = useQuery({
    queryKey: PENDIENTES_DE_ALTA_QUERY_KEY,
    queryFn: listarPreInscripcionesPendientes,
    refetchOnMount: "always",
  });
  const pendiente = pendientes.isFetching
    ? undefined
    : pendientes.data?.find((p) => p.idInscripcion === String(idInscripcion));
  // Mientras se registra el cobro la lista se actualiza y el alumno sale de ella: eso no es "no encontrada".
  const noEncontrada = !pendientes.isFetching && !pendiente && confirmarAlta.isIdle;

  useEffect(() => {
    if (!noEncontrada) return;
    toast.info("La pre-inscripción quedó en Pendientes de alta: registrá el cobro desde ahí.");
    onTerminar();
  }, [noEncontrada, onTerminar]);

  if (!pendiente) return null;
  return (
    <ModalConfirmarAlta
      pendiente={pendiente}
      formas={formas}
      confirmando={confirmarAlta.isPending}
      error={confirmarAlta.error}
      onClose={onTerminar}
      onConfirm={(pago) =>
        confirmarAlta.mutate(pago, {
          onSuccess: () => {
            toast.success(`${pendiente.nombre} ${pendiente.apellido} quedó activo`);
            onTerminar();
          },
        })
      }
    />
  );
}
