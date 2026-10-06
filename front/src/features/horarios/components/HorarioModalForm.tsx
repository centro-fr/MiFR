import React, { useState } from 'react';
import type { Actividad } from '../../../types/actividad';
import type { Profesora, DiaSemana, Horario, HorarioFormData } from '../../../types/horarios';
import { X, AlertCircle } from 'lucide-react';
import { textoCupo } from '../utils/cupo';
import { horarioFormSchema } from '../schemas/horario';

interface HorarioModalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: HorarioFormData) => { ok: true } | { ok: false; error: string };
  onValidate?: (data: HorarioFormData, ignoreId?: string) => { ok: true } | { ok: false; error: string };
  onDelete?: () => void;
  actividades: Actividad[];
  profesoras: Profesora[];
  horarioEnEdicion?: Horario | null;
  diaSugerido?: DiaSemana;
  horaSugerida?: string;
}

const DIAS_SEMANA: { id: DiaSemana; label: string }[] = [
  { id: 'LUNES', label: 'Lunes' },
  { id: 'MARTES', label: 'Martes' },
  { id: 'MIERCOLES', label: 'Miércoles' },
  { id: 'JUEVES', label: 'Jueves' },
  { id: 'VIERNES', label: 'Viernes' },
  { id: 'SABADO', label: 'Sábado' },
];

function horaFinSugerida(horaInicioSugerida: string): string {
  const [h, m] = horaInicioSugerida.split(':').map(Number);
  const nextH = Math.min(h + 1, 20);
  return `${String(nextH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const HorarioModalForm: React.FC<HorarioModalFormProps> = ({
  isOpen,
  onClose,
  onSave,
  onValidate,
  onDelete,
  actividades,
  profesoras,
  horarioEnEdicion,
  diaSugerido,
  horaSugerida,
}) => {
  // El formulario se inicializa desde las props al montar. El padre lo
  // desmonta al cerrar (render condicional), así cada apertura parte de
  // valores frescos sin necesidad de useEffect.
  const [actividadId, setActividadId] = useState<string>(
    horarioEnEdicion?.actividadId ?? actividades[0]?.id ?? '',
  );
  const [profesoraId, setProfesoraId] = useState<string>(
    horarioEnEdicion?.profesoraId ?? profesoras[0]?.id ?? '',
  );
  const [diaSemana, setDiaSemana] = useState<DiaSemana>(
    horarioEnEdicion?.diaSemana ?? diaSugerido ?? 'LUNES',
  );
  const [horaInicio, setHoraInicio] = useState<string>(
    horarioEnEdicion?.horaInicio ?? horaSugerida ?? '08:00',
  );
  const [horaFin, setHoraFin] = useState<string>(() =>
    horarioEnEdicion ? horarioEnEdicion.horaFin : horaFinSugerida(horaSugerida ?? '08:00'),
  );
  // Vacío = el horario usa el cupo de la actividad (cupo_maximo null en el back).
  const [cupoPropio, setCupoPropio] = useState<number | null>(horarioEnEdicion?.cupoPropio ?? null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedActividad = actividades.find((a) => a.id === actividadId);

  const getFormData = (): HorarioFormData => ({
    actividadId,
    profesoraId,
    diaSemana,
    horaInicio,
    horaFin,
    cupoPropio,
  });

  const validarCamposBasicos = (): boolean => {
    const resultado = horarioFormSchema.safeParse(getFormData());
    if (!resultado.success) {
      setErrorMessage(resultado.error.issues[0].message);
      return false;
    }
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validarCamposBasicos()) return;

    const formData = getFormData();

    // 1. Verificación PREVENTIVA obligatoria de superposición horaria y salón
    // Se ejecuta SIEMPRE antes de cualquier reestructuración para asegurar que el cambio sea factible.
    if (onValidate) {
      const validacion = onValidate(formData, horarioEnEdicion?.id);
      if (!validacion.ok) {
        setErrorMessage(validacion.error || 'Conflicto de superposición detectado.');
        return; // SE FRENA AQUÍ: no abre el modal de reestructuración si hay superposición
      }
    }

    // 2. Guardar horario
    ejecutarGuardado();
  };

  const ejecutarGuardado = () => {
    const result = onSave(getFormData());

    if (!result.ok) {
      setErrorMessage(result.error);
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-horario-title"
        className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
      >
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
          {/* Cabecera del modal */}
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#BC1266] px-2 py-0.5 rounded-md bg-pink-100">
                Cronograma
              </span>
              <h3 id="modal-horario-title" className="text-base font-extrabold text-slate-900 mt-1">
                {horarioEnEdicion ? 'Editar Horario Semanal' : 'Asignar Nuevo Horario'}
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar formulario"
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-600 font-bold transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alerta de Conflicto de Superposición / Validación */}
          {errorMessage && (
            <div className="bg-red-50 border-b border-red-200 p-4 animate-shake">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-red-800 uppercase">Validación de Horario</h4>
                  <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Actividad */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="horario-actividad" className="block text-xs font-bold text-slate-700">
                  Actividad / Disciplina
                </label>
              </div>
              <select
                id="horario-actividad"
                value={actividadId}
                onChange={(e) => setActividadId(e.target.value)}
                className="w-full text-xs rounded-xl p-2.5 outline-none transition bg-slate-50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#E91E82]"
                required
              >
                {actividades.map((act) => (
                  <option key={act.id} value={act.id}>
                    {act.nombre} ({act.modalidad === 'PERSONALIZADA' ? 'Personalizada' : 'Grupal'} - Cupo: {textoCupo(act.cupoMaximo)})
                  </option>
                ))}
              </select>
            </div>

            {/* Profesora */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="horario-profesora" className="block text-xs font-bold text-slate-700">
                  Profesora responsable
                </label>
              </div>
              <select
                id="horario-profesora"
                value={profesoraId}
                onChange={(e) => setProfesoraId(e.target.value)}
                className="w-full text-xs rounded-xl p-2.5 outline-none transition bg-slate-50 border border-slate-300 text-slate-800 focus:ring-2 focus:ring-[#E91E82]"
                required
              >
                {profesoras.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.nombre} {prof.apellido}
                  </option>
                ))}
              </select>
            </div>

            {/* Día y Cupo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="horario-dia" className="block text-xs font-bold text-slate-700 mb-1">
                  Día
                </label>
                <select
                  id="horario-dia"
                  value={diaSemana}
                  onChange={(e) => setDiaSemana(e.target.value as DiaSemana)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#E91E82]"
                  required
                >
                  {DIAS_SEMANA.map((dia) => (
                    <option key={dia.id} value={dia.id}>
                      {dia.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="horario-cupo" className="block text-xs font-bold text-slate-700 mb-1">
                  Cupo propio <span className="text-slate-400 font-normal">(opcional)</span>
                </label>
                <input
                  id="horario-cupo"
                  type="number"
                  min="1"
                  max="32767"
                  value={cupoPropio ?? ''}
                  onChange={(e) => setCupoPropio(e.target.value ? parseInt(e.target.value, 10) : null)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#E91E82]"
                  placeholder={`De la actividad: ${textoCupo(selectedActividad?.cupoMaximo ?? null)}`}
                />
              </div>
            </div>

            {/* Horas Inicio y Fin */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="horario-inicio" className="block text-xs font-bold text-slate-700 mb-1">
                  Hora Inicio <span className="text-slate-400 font-normal">(07:00 a 19:00)</span>
                </label>
                <input
                  id="horario-inicio"
                  type="time"
                  min="07:00"
                  max="19:00"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#E91E82]"
                  required
                />
              </div>
              <div>
                <label htmlFor="horario-fin" className="block text-xs font-bold text-slate-700 mb-1">
                  Hora Fin <span className="text-slate-400 font-normal">(máx 20:00)</span>
                </label>
                <input
                  id="horario-fin"
                  type="time"
                  min="08:00"
                  max="20:00"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-[#E91E82]"
                  required
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              {horarioEnEdicion && onDelete ? (
                <button
                  type="button"
                  className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                  onClick={onDelete}
                >
                  Eliminar horario
                </button>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  onClick={onClose}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-[#E91E82] hover:bg-[#BC1266] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition cursor-pointer"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};
