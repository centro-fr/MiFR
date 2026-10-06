import React from 'react';
import type { Horario } from '../../../types/horarios';
import { Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  horario: Horario | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  horario,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !horario) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 overflow-y-auto bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-[640px] w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 md:px-8 py-5 md:py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
              <Trash2 className="w-6 h-6 md:w-7 md:h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-red-700 bg-red-100 px-2.5 py-1 rounded-md">
                Baja de Horario
              </span>
              <h3 id="delete-modal-title" className="text-xl md:text-2xl font-extrabold text-[#181C26] mt-2 tracking-tight">
                ¿Eliminar clase del cronograma?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 md:p-8 space-y-5">
          <div className="p-5 md:p-6 bg-slate-50 rounded-2xl border border-slate-200 text-sm md:text-base text-slate-700 space-y-2.5">
            <div className="flex items-center justify-between gap-3 font-bold text-slate-900">
              <span className="text-base md:text-lg">{horario.actividadNombre}</span>
              <span className="text-[#BC1266] text-sm md:text-base">{horario.diaSemana}</span>
            </div>
            <div className="text-slate-500">
              Profesora: <strong className="text-slate-800">{horario.profesoraNombre}</strong>
            </div>
            <div className="text-slate-500">
              Franja horaria: <strong className="text-slate-800">{horario.horaInicio} a {horario.horaFin} hs</strong>
            </div>
          </div>

          <p className="text-sm md:text-base text-slate-500 leading-relaxed">
            La baja es lógica: el horario sale del cronograma y queda en el historial.
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 min-h-[48px] text-sm md:text-base font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-7 py-3 min-h-[48px] text-sm md:text-base font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-5 h-5" />
            <span>Confirmar Baja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
