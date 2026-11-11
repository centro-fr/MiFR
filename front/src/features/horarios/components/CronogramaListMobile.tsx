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
    <div className="space-y-4">
      {/* Selector de días con Estándar Unificado de Pestañas (igual que Mis Clases) */}
      <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none select-none">
        {DIAS_TAB.map((dia) => {
          const isSelected = selectedDay === dia.id;
          const count = countPorDia[dia.id] || 0;

          return (
            <button
              key={dia.id}
              type="button"
              onClick={() => setSelectedDay(dia.id)}
              className={cn(
                'flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors',
                isSelected
                  ? 'border-primary text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200',
              )}
            >
              <span>{dia.label}</span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs font-black transition-colors',
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Clases del día */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-dark dark:text-white uppercase tracking-wide">
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
              className="inline-flex h-auto min-h-[38px] gap-1 rounded-lg bg-pink-50 dark:bg-primary/15 px-2.5 py-1.5 text-xs sm:text-sm font-bold text-primary hover:bg-pink-100 dark:hover:bg-primary/25 hover:text-primary-dark dark:hover:text-pink-300 [&_svg]:size-3.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Nueva clase</span>
            </Button>
          )}
        </div>

        {horariosDelDia.length === 0 ? (
          <Card className="rounded-lg border-border p-8 text-center shadow-2xs">
            <CardContent className="p-0">
              <h4 className="text-sm font-bold text-foreground">
                No hay clases programadas para este día
              </h4>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
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
          horariosDelDia.map((horario) => (
            <div
              key={horario.id}
              onClick={() => onEdit(horario)}
              className="w-full text-left rounded-lg border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-xs hover:border-primary/50 active:scale-[0.99] transition-all flex flex-col gap-3 cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs font-black text-primary">
                      <Clock className="size-3.5" />
                      {horario.horaInicio} - {horario.horaFin} hs
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] px-1.5 py-0 font-bold',
                        horario.actividadTipo === 'PERSONALIZADA'
                          ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
                      )}
                    >
                      {horario.actividadTipo === 'PERSONALIZADA' ? 'Personalizada' : 'Grupal'}
                    </Badge>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                    {horario.actividadNombre}
                  </h4>

                  <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {horario.profesoraNombre}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="size-3.5" />
                      Cupo: <strong className="text-slate-700 dark:text-slate-200">{textoCupo(horario.cupoMaximo)}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(horario);
                  }}
                  className="inline-flex h-8 gap-1.5 rounded-lg border-slate-200 dark:border-slate-700 bg-transparent px-3 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 [&_svg]:size-3.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(horario);
                  }}
                  className="inline-flex h-8 gap-1.5 rounded-lg border-rose-200 dark:border-rose-900/50 bg-transparent px-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 [&_svg]:size-3.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
