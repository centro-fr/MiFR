import React from 'react';
import type { Horario } from '../../../types/horarios';
import { Users, Clock, Pencil, Trash2 } from 'lucide-react';
import { textoCupo } from '../utils/cupo';

export interface HorarioCardProps {
  horario: Horario;
  onEdit: (horario: Horario) => void;
  onDelete: (horario: Horario) => void;
  compact?: boolean;
}

export const HorarioCard: React.FC<HorarioCardProps> = ({
  horario,
  onEdit,
  onDelete,
  compact = false,
}) => {
  const theme = horario.tema;
  const isPersonalizada = horario.actividadTipo === 'PERSONALIZADA';

  return (
    <div
      className={`group relative rounded-xl border-0 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden ${
        compact ? 'p-3' : 'p-4'
      }`}
      style={{
        backgroundColor: theme.bg,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          {/* Badge profesora y hora */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase shadow-2xs"
              style={{
                backgroundColor: theme.badgeBg,
                color: theme.badgeText,
              }}
            >
              {horario.profesoraNombre}
            </span>
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-600" />
              {horario.horaInicio} - {horario.horaFin}
            </span>
          </div>

          {/* Nombre de la actividad */}
          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">
            {horario.actividadNombre}
          </h4>

          {/* Tipo de actividad */}
          <p className="text-xs text-slate-600 mt-0.5 font-medium">
            {isPersonalizada ? 'Personalizada 1:1' : 'Clase Grupal'}
          </p>
        </div>

        {/* Botones de acción rápida */}
        <div className="flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(horario);
            }}
            className="p-1.5 text-slate-600 hover:text-[#E91E82] hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
            title="Editar horario"
            aria-label="Editar horario"
          >
            <Pencil className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(horario);
            }}
            className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-white/80 rounded-lg transition-colors cursor-pointer"
            title="Eliminar horario"
            aria-label="Eliminar horario"
          >
            <Trash2 className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Footer de la tarjeta: cupo */}
      <div
        className="mt-3 pt-2 border-t flex items-center gap-1.5 text-xs text-slate-500"
        style={{ borderColor: `${theme.border}90` }}
      >
        <Users className="w-3.5 h-3.5 text-slate-400" />
        <span>
          Cupo: <span className="font-semibold text-slate-700">{textoCupo(horario.cupoMaximo)}</span>
        </span>
      </div>
    </div>
  );
};

// Alias con nombre semántico
export const TarjetaHorario = HorarioCard;
