import { useRef } from "react";
import { useDialogA11y } from "@/hooks/use-dialog-a11y";
import type { Actividad } from "@/types/actividad";

interface Props {
  actividad: Actividad;
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// El back rechaza la baja (409) si la actividad todavía tiene horarios activos: ese
// mensaje llega en errorBaja.
export function ModalBajaActividad({ actividad, dandoDeBaja, errorBaja, onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ active: true, onClose, dialogRef });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baja-actividad-titulo"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 dark:bg-surface-low dark:border-white/10"
      >
        <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black dark:bg-rose-500/15 dark:text-rose-300">
          ⚠
        </div>
        <div>
          <h4 id="baja-actividad-titulo" className="text-base font-extrabold text-[#181C26] dark:text-white">
            ¿Dar de baja esta actividad?
          </h4>
          <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
            Estás por dar de baja <strong>{actividad.nombre}</strong>. La baja es lógica: sale del catálogo y queda en
            el historial. Si tiene horarios activos, primero hay que darlos de baja.
          </p>
        </div>
        {errorBaja && (
          <p role="alert" className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200">
            {errorBaja}
          </p>
        )}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            data-autofocus
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={dandoDeBaja}
            className="min-h-[44px] bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white px-4 rounded-xl text-sm font-bold shadow-md"
          >
            {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
          </button>
        </div>
      </div>
    </div>
  );
}
