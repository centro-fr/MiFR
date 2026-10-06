import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmClearScheduleModalProps {
  isOpen: boolean;
  totalHorarios: number;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmClearScheduleModal: React.FC<ConfirmClearScheduleModalProps> = ({
  isOpen,
  totalHorarios,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between pb-3">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mt-2">
            ¿Vaciar todo el cronograma?
          </h3>

          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Estás a punto de eliminar las <strong className="text-slate-900">{totalHorarios} clases</strong> programadas actualmente en el cronograma semanal.
          </p>

          <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            Se eliminarán todas las clases asignadas al salón semanal.
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Sí, vaciar cronograma</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
