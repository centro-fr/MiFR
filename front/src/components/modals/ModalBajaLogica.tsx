import { useRef } from 'react';
import { useDialogA11y } from '../../hooks/use-dialog-a11y';
import type { Actividad } from '../../types/actividad';

export const ModalBajaLogica = ({ actividad, onClose, onConfirm }: { actividad: Actividad, onClose: () => void, onConfirm: () => void }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogA11y({ active: true, onClose, dialogRef });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="baja-logica-titulo"
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 dark:bg-surface-low dark:border-white/10"
      >
        <div aria-hidden="true" className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black dark:bg-rose-500/15 dark:text-rose-300">⚠</div>
        <div>
          <h4 id="baja-logica-titulo" className="text-base font-extrabold text-[#181C26] dark:text-white">¿Dar de baja esta actividad?</h4>
          <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">Estás por dar de baja <strong>{actividad.nombre}</strong>.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/20 dark:text-amber-200">
          <span className="font-bold block">¡Atención! Tiene horarios futuros con alumnos</span>
          <span className="text-sm mt-0.5 block leading-relaxed">
            Esta actividad tiene <strong>{actividad.turnosPendientes} turnos programados</strong> y <strong>{actividad.alumnosInscriptos} alumnos inscriptos</strong>. Desaparecerá del catálogo, pero la baja es <strong>lógica</strong>: no borra las transferencias ni los cobros ya registrados.
          </span>
        </div>
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
            className="min-h-[44px] bg-rose-600 hover:bg-rose-700 text-white px-4 rounded-xl text-sm font-bold shadow-md"
          >
            Confirmar baja lógica
          </button>
        </div>
      </div>
    </div>
  );
};
