import type { Actividad } from '../../types/actividad';

export const ModalBajaLogica = ({ actividad, onClose, onConfirm }: { actividad: Actividad, onClose: () => void, onConfirm: () => void }) => {
  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-black">⚠</div>
        <div>
          <h4 className="text-base font-extrabold text-[#181C26]">¿Dar de baja esta actividad?</h4>
          <p className="text-xs text-slate-600 mt-1">Estás por dar de baja <strong>{actividad.nombre}</strong>.</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
          <span className="font-bold block">¡Atención! Tiene horarios futuros con alumnos</span>
          <span className="text-[11px] mt-0.5 block leading-relaxed">
            Esta actividad tiene <strong>{actividad.turnosPendientes} turnos programados</strong> y <strong>{actividad.alumnosInscriptos} alumnos inscriptos</strong>. La baja es <strong>lógica</strong>: no borra pagos pasados.
          </span>
        </div>
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">Cancelar</button>
          <button onClick={onConfirm} className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md">Confirmar baja lógica</button>
        </div>
      </div>
    </div>
  );
};