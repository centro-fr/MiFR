import React from 'react';
import type { Actividad, Profesora, DiaSemana } from '../../../types/horarios';
import { Plus, Filter, Calendar as CalendarIcon, Dumbbell, User } from 'lucide-react';

interface HorariosHeaderProps {
  actividades: Actividad[];
  profesoras: Profesora[];
  filtroActividad: string;
  setFiltroActividad: (val: string) => void;
  filtroProfesora: string;
  setFiltroProfesora: (val: string) => void;
  filtroDia: string;
  setFiltroDia: (val: string) => void;
  onNuevoHorario: () => void;
  totalHorarios: number;
}

const DIAS: { id: DiaSemana | 'TODOS'; label: string }[] = [
  { id: 'TODOS', label: 'Todos los días' },
  { id: 'LUNES', label: 'Lunes' },
  { id: 'MARTES', label: 'Martes' },
  { id: 'MIERCOLES', label: 'Miércoles' },
  { id: 'JUEVES', label: 'Jueves' },
  { id: 'VIERNES', label: 'Viernes' },
  { id: 'SABADO', label: 'Sábado' },
];

export const HorariosHeader: React.FC<HorariosHeaderProps> = ({
  actividades,
  profesoras,
  filtroActividad,
  setFiltroActividad,
  filtroProfesora,
  setFiltroProfesora,
  filtroDia,
  setFiltroDia,
  onNuevoHorario,
  totalHorarios,
}) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Título y Botón Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-pink-50 text-[#E91E82]">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Actividades y Horarios
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  Cronograma semanal y asignación de profesoras ({totalHorarios} clases programadas)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onNuevoHorario}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#E91E82] to-[#BC1266] hover:from-[#BC1266] hover:to-[#900e4e] shadow-md hover:shadow-lg transition-all transform active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Asignar Horario</span>
          </button>
        </div>

        {/* Barra de Filtros */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">
            <Filter className="w-3.5 h-3.5" />
            Filtros:
          </div>

          {/* Filtro por Actividad */}
          <div className="relative min-w-[170px]">
            <select
              value={filtroActividad}
              onChange={(e) => setFiltroActividad(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E91E82] transition-colors appearance-none cursor-pointer"
            >
              <option value="TODAS">Todas las actividades</option>
              {actividades.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.nombre}
                </option>
              ))}
            </select>
            <Dumbbell className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filtro por Profesora */}
          <div className="relative min-w-[170px]">
            <select
              value={filtroProfesora}
              onChange={(e) => setFiltroProfesora(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E91E82] transition-colors appearance-none cursor-pointer"
            >
              <option value="TODAS">Todas las profesoras</option>
              {profesoras.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nombre} {prof.apellido}
                </option>
              ))}
            </select>
            <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filtro por Día (útil en mobile y desktop) */}
          <div className="relative min-w-[150px]">
            <select
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="w-full pl-8 pr-4 py-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E91E82] transition-colors appearance-none cursor-pointer"
            >
              {DIAS.map((dia) => (
                <option key={dia.id} value={dia.id}>
                  {dia.label}
                </option>
              ))}
            </select>
            <CalendarIcon className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset filtros */}
          {(filtroActividad !== 'TODAS' || filtroProfesora !== 'TODAS' || filtroDia !== 'TODOS') && (
            <button
              onClick={() => {
                setFiltroActividad('TODAS');
                setFiltroProfesora('TODAS');
                setFiltroDia('TODOS');
              }}
              className="text-xs font-medium text-[#E91E82] hover:text-[#BC1266] underline ml-auto transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
