import React, { useState, useEffect } from 'react';
import type { Actividad, GrupoActividad } from '../../types/actividad';

interface Props {
  actividad: Actividad | null;
  onClose: () => void;
  onSave: (data: Partial<Actividad>) => void;
}

export const ModalFormActividad: React.FC<Props> = ({ actividad, onClose, onSave }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [grupo, setGrupo] = useState<GrupoActividad>('GRUPAL');
  const [cupo, setCupo] = useState('20 alumnos');

  useEffect(() => {
    if (actividad) {
      setNombre(actividad.nombre);
      setDescripcion(actividad.descripcion);
      setGrupo(actividad.grupo);
      setCupo(actividad.cupo);
    }
  }, [actividad]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      nombre,
      descripcion,
      grupo,
      tipoBadge: grupo === 'INDIVIDUAL' ? 'Personalizada' : grupo === 'HIBRIDA' ? 'Grupal / Personalizada' : 'Grupal',
      cupo: grupo === 'INDIVIDUAL' ? '1 alumno (Estricto)' : cupo,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity animate-fade-in">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between border-l border-slate-200 animate-slide-left">
        
        {/* Cabecera del Panel */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 text-[#E91E82] flex items-center justify-center font-bold text-base shadow-xs">
              ✨
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {actividad ? 'Editar Disciplina' : 'Nueva Actividad Oficial'}
              </h3>
              <p className="text-xs text-slate-500">Configura los parámetros, modalidad y cupos del centro.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          
          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-700 text-xs uppercase tracking-wider">
              Nombre de la Actividad <span className="text-[#E91E82]">*</span>
            </label>
            <input 
              type="text" 
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Yoga Vinyasa, Funcional, Posing..." 
              className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-800 bg-slate-50/50 focus:bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 transition-all outline-none" 
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="block font-extrabold text-slate-700 text-xs uppercase tracking-wider">
              Descripción Corta <span className="text-slate-400 font-normal lowercase">(opcional)</span>
            </label>
            <textarea 
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalla brevemente el enfoque de la clase o sus objetivos..." 
              className="w-full text-xs border border-slate-200 rounded-xl px-4 py-3 text-slate-700 bg-slate-50/50 focus:bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 transition-all outline-none resize-none leading-relaxed" 
            />
          </div>

          {/* Selector de Modalidad (Cards interactivas) */}
          <div className="space-y-2">
            <label className="block font-extrabold text-slate-700 text-xs uppercase tracking-wider">
              Modalidad de la Disciplina <span className="text-[#E91E82]">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              
              {/* Grupal */}
              <div 
                onClick={() => setGrupo('GRUPAL')}
                className={`cursor-pointer border-2 p-3.5 rounded-2xl flex flex-col justify-between transition-all ${
                  grupo === 'GRUPAL' 
                    ? 'border-[#E91E82] bg-pink-50/60 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">👥</span>
                  <input type="radio" name="modalidad" checked={grupo === 'GRUPAL'} onChange={() => setGrupo('GRUPAL')} className="accent-[#E91E82]" />
                </div>
                <div>
                  <div className={`font-bold text-xs ${grupo === 'GRUPAL' ? 'text-[#BC1266]' : 'text-slate-800'}`}>Grupal</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Clases masivas o tradicionales.</div>
                </div>
              </div>

              {/* Híbrida */}
              <div 
                onClick={() => setGrupo('HIBRIDA')}
                className={`cursor-pointer border-2 p-3.5 rounded-2xl flex flex-col justify-between transition-all ${
                  grupo === 'HIBRIDA' 
                    ? 'border-[#E91E82] bg-pink-50/60 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">🔄</span>
                  <input type="radio" name="modalidad" checked={grupo === 'HIBRIDA'} onChange={() => setGrupo('HIBRIDA')} className="accent-[#E91E82]" />
                </div>
                <div>
                  <div className={`font-bold text-xs ${grupo === 'HIBRIDA' ? 'text-[#BC1266]' : 'text-slate-800'}`}>Híbrida</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">Grupal o personalizada según turno.</div>
                </div>
              </div>

              {/* Individual */}
              <div 
                onClick={() => setGrupo('INDIVIDUAL')}
                className={`cursor-pointer border-2 p-3.5 rounded-2xl flex flex-col justify-between transition-all ${
                  grupo === 'INDIVIDUAL' 
                    ? 'border-[#E91E82] bg-pink-50/60 shadow-sm' 
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base">👤</span>
                  <input type="radio" name="modalidad" checked={grupo === 'INDIVIDUAL'} onChange={() => setGrupo('INDIVIDUAL')} className="accent-[#E91E82]" />
                </div>
                <div>
                  <div className={`font-bold text-xs ${grupo === 'INDIVIDUAL' ? 'text-[#BC1266]' : 'text-slate-800'}`}>Individual</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">1 a 1 estricto (cupo 1).</div>
                </div>
              </div>

            </div>
          </div>

          {/* Cupo Dinámico según la Modalidad Elegida */}
          <div className={`p-4 rounded-2xl border transition-all ${
            grupo === 'INDIVIDUAL' 
              ? 'bg-amber-50/80 border-amber-200 text-amber-900' 
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-extrabold text-xs uppercase tracking-wide">Aforo / Cupo Máximo</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                grupo === 'INDIVIDUAL' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-300' 
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {grupo === 'INDIVIDUAL' ? 'Bloqueado a 1 Alumno' : 'Flexible'}
              </span>
            </div>

            {grupo === 'INDIVIDUAL' ? (
              <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                Al tratarse de una disciplina individual o específica, el cupo queda fijado automáticamente en <strong>1 persona</strong> por turno.
              </p>
            ) : (
              <>
                <input 
                  type="text" 
                  value={cupo}
                  onChange={(e) => setCupo(e.target.value)}
                  placeholder="Ej: 20 alumnos, Según horario..." 
                  className="w-full text-xs border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold bg-white focus:border-[#E91E82] focus:ring-2 focus:ring-pink-100 outline-none" 
                />
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Indica la cantidad máxima de asistentes permitida por sala para diagramar los turnos correctamente.
                </p>
              </>
            )}
          </div>

        </form>

        {/* Acciones Inferiores */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleSubmit} 
            className="bg-[#E91E82] hover:bg-[#BC1266] text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md shadow-[#E91E82]/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            Guardar Actividad
          </button>
        </div>

      </div>
    </div>
  );
};