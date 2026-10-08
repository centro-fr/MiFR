import React from 'react';
import type { DiaSemana, Horario } from '../../../types/horarios';
import { Plus, Clock, Users, Pencil, Trash2 } from 'lucide-react';
import { textoCupo } from '../utils/cupo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/utils/cn';

interface CronogramaListMobileProps {
  horarios: Horario[];
  onEdit: (horario: Horario) => void;
  onDelete: (horario: Horario) => void;
  onAddForDay: (dia: DiaSemana) => void;
  selectedDay: DiaSemana;
  setSelectedDay: (dia: DiaSemana) => void;
  isFilterActive?: boolean;
}

const DIAS_TAB: { id: DiaSemana; label: string; shortLabel: string }[] = [
  { id: 'LUNES', label: 'Lunes', shortLabel: 'Lun' },
  { id: 'MARTES', label: 'Martes', shortLabel: 'Mar' },
  { id: 'MIERCOLES', label: 'Miércoles', shortLabel: 'Mié' },
  { id: 'JUEVES', label: 'Jueves', shortLabel: 'Jue' },
  { id: 'VIERNES', label: 'Viernes', shortLabel: 'Vie' },
  { id: 'SABADO', label: 'Sábado', shortLabel: 'Sáb' },
];

export const CronogramaListMobile: React.FC<CronogramaListMobileProps> = ({
  horarios,
  onEdit,
  onDelete,
  onAddForDay,
  selectedDay,
  setSelectedDay,
  isFilterActive = false,
}) => {
  const horariosDelDia = horarios
    .filter((h) => h.diaSemana === selectedDay)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  // Conteo de clases por día para badges de pestañas
  const countPorDia = DIAS_TAB.reduce<Record<DiaSemana, number>>((acc, d) => {
    acc[d.id] = horarios.filter((h) => h.diaSemana === d.id).length;
    return acc;
  }, {} as Record<DiaSemana, number>);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50">
      {/* Selector de días */}
      <div className="bg-white px-3 py-2.5 border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-2xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-center select-none no-scrollbar">
          {DIAS_TAB.map((dia) => {
            const isSelected = selectedDay === dia.id;
            const count = countPorDia[dia.id] || 0;

            return (
              <Button
                key={dia.id}
                type="button"
                onClick={() => setSelectedDay(dia.id)}
                className={cn(
                  'shrink-0 gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-all',
                  isSelected
                    ? 'bg-[#E91E82] text-white shadow-xs scale-102 hover:bg-[#E91E82]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300',
                )}
              >
                <span>{dia.label}</span>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full border-0 px-1.5 py-0.5 text-xs font-extrabold',
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-600',
                  )}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Clases del día */}
      <div className="p-3 sm:p-4 space-y-3 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-[#181C26] uppercase tracking-wide">
              {selectedDay}
            </h3>
            <span className="text-sm font-semibold text-slate-400">
              ({horariosDelDia.length} {horariosDelDia.length === 1 ? 'clase' : 'clases'})
            </span>
          </div>

          {!isFilterActive && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => onAddForDay(selectedDay)}
              className="inline-flex h-auto min-h-[44px] gap-1 rounded-lg bg-pink-50 px-2.5 py-1.5 text-sm font-bold text-[#E91E82] hover:bg-pink-100 hover:text-[#BC1266] [&_svg]:size-3.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nueva clase</span>
            </Button>
          )}
        </div>

        {horariosDelDia.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 p-8 text-center shadow-2xs">
            <CardContent className="p-0">
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#E91E82] flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-800">
                No hay clases programadas para este día
              </h4>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                {isFilterActive
                  ? 'Ninguna clase coincide con los filtros activos para este día.'
                  : 'El salón se encuentra libre durante todo este día.'}
              </p>
              {!isFilterActive && (
                <Button
                  type="button"
                  onClick={() => onAddForDay(selectedDay)}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Asignar primera clase a {selectedDay}</span>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          horariosDelDia.map((horario) => {
            const theme = horario.tema;

            return (
              <Card
                key={horario.id}
                onClick={() => onEdit(horario)}
                className="relative flex cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border-slate-200/80 p-4 shadow-xs transition hover:shadow-md active:scale-[0.99]"
              >
                {/* Indicador de modalidad */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5"
                  style={{ backgroundColor: theme.primary }}
                />

                {/* Horario y profesora */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="gap-1.5 rounded-lg border-0 bg-slate-100 px-2.5 py-1 text-sm font-extrabold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      {horario.horaInicio} - {horario.horaFin} hs
                    </span>
                  </Badge>

                  <Badge
                    variant="outline"
                    className="max-w-[160px] truncate rounded-md border-0 px-2.5 py-0.5 text-xs font-extrabold shadow-2xs"
                    style={{
                      backgroundColor: theme.badgeBg,
                      color: theme.badgeText,
                    }}
                  >
                    {horario.profesoraNombre}
                  </Badge>
                </div>

                {/* Actividad y modalidad */}
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-extrabold text-slate-900 leading-tight">
                      {horario.actividadNombre}
                    </h4>
                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 rounded-md border-0 px-2 py-0.5 text-xs font-bold',
                        horario.actividadTipo === 'PERSONALIZADA'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800',
                      )}
                    >
                      {horario.actividadTipo === 'PERSONALIZADA' ? 'Personalizada 1:1' : 'Grupal'}
                    </Badge>
                  </div>
                </div>

                {/* Cupo */}
                <div className="flex items-center gap-1 bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-sm text-slate-600">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>Cupo:</span>
                  <strong className="text-slate-900">{textoCupo(horario.cupoMaximo)}</strong>
                </div>

                {/* Acciones */}
                <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(horario);
                    }}
                    className="inline-flex h-auto min-h-[44px] gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-900 [&_svg]:size-3.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(horario);
                    }}
                    className="inline-flex h-auto min-h-[44px] gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-100 hover:text-red-700 [&_svg]:size-3.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
