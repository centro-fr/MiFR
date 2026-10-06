import React from 'react';
import type { Horario } from '../../../types/horarios';
import { Trash2, X, Users } from 'lucide-react';

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

  const inscriptosCount = horario.inscriptosActuales ?? horario.inscriptos ?? 0;
  const tieneInscriptos = inscriptosCount > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Cabecera */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
              <Trash2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                Baja de Horario
              </span>
              <h3 id="delete-modal-title" className="text-base font-extrabold text-[#181C26] mt-0.5">
                ¿Eliminar clase del cronograma?
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1.5">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>{horario.actividadNombre}</span>
              <span className="text-[#BC1266]">{horario.diaSemana}</span>
            </div>
            <div className="text-slate-500">
              Profesora: <strong className="text-slate-800">{horario.profesoraNombre}</strong>
            </div>
            <div className="text-slate-500">
              Franja horaria: <strong className="text-slate-800">{horario.horaInicio} a {horario.horaFin} hs</strong>
            </div>
          </div>

          {tieneInscriptos ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
              <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-snug">
                Hay <strong>{inscriptosCount} alumno{inscriptosCount > 1 ? 's' : ''} inscripto{inscriptosCount > 1 ? 's' : ''}</strong>. Quedarán como <em>sin clase asignada</em> para reubicarlos, sin perder su plan ni cuota.
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              Esta clase no tiene alumnos inscriptos. Se eliminará del cronograma.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Confirmar Baja</span>
          </button>
        </div>
      </div>
    </div>
  );
};
