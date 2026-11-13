import { ConfirmarAccion } from "@/components/ui/confirmar-accion";

interface PropsFrecuencia {
  antes: string;
  despues: string;
  guardando: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// La frecuencia define cuántos horarios puede elegir quien ya está inscripto: se confirma aparte.
export function ModalCambioFrecuencia({ antes, despues, guardando, onClose, onConfirm }: PropsFrecuencia) {
  return (
    <ConfirmarAccion
      titulo="¿Cambiar la frecuencia semanal?"
      descripcion={
        <>
          {antes} → <strong className="text-slate-900 dark:text-white">{despues}</strong>. Rige para los alumnos del plan desde ahora.
        </>
      }
      textoConfirmar="Cambiar"
      textoConfirmando="Guardando…"
      confirmando={guardando}
      peligro={false}
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  );
}

interface PropsBaja {
  nombre: string;
  dandoDeBaja: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// US-11: un plan nunca se elimina. La baja es lógica: quienes ya lo tienen lo conservan.
export function ModalBajaPlan({ nombre: _nombre, dandoDeBaja, error, onClose, onConfirm }: PropsBaja) {
  return (
    <ConfirmarAccion
      titulo="¿Seguro que desea realizar la baja?"
      descripcion="Deja de ofrecerse a nuevos alumnos; quienes ya lo tienen lo conservan."
      textoConfirmar="Dar de baja"
      textoConfirmando="Dando de baja…"
      confirmando={dandoDeBaja}
      error={error}
      onConfirmar={onConfirm}
      onCancelar={onClose}
    />
  );
}
