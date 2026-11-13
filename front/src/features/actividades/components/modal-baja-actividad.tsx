import { ConfirmarAccion } from "@/components/ui/confirmar-accion";
import type { Actividad } from "@/types/actividad";

interface Props {
  actividad: Actividad;
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// El back rechaza la baja (409) si la actividad todavía tiene horarios activos: ese mensaje llega en
// errorBaja.
export function ModalBajaActividad({ actividad: _actividad, dandoDeBaja, errorBaja, onClose, onConfirm }: Props) {
  return (
    <ConfirmarAccion
      titulo="¿Seguro que desea realizar la baja?"
      descripcion="Sale del catálogo y queda en el historial."
      textoConfirmar="Dar de baja"
      textoConfirmando="Dando de baja…"
      confirmando={dandoDeBaja}
      error={errorBaja}
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  );
}
