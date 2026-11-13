import React from 'react';
import type { DiaSemana, Horario } from '../../../types/horarios';
import { Plus } from 'lucide-react';
import { textoCupo } from '../utils/cupo';
import { InsigniaBajaProgramada } from './insignia-baja-programada';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FilaMovil } from '@/components/ui/fila-movil';
import { BOTON_FILA, BOTON_FILA_PELIGRO, LISTA_MOVIL } from '@/components/ui/estilos-lista';
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
          <ul aria-label={`Horarios del ${DIAS_TAB.find((d) => d.id === selectedDay)?.label ?? 'día'}`} className={LISTA_MOVIL}>
            {horariosDelDia.map((horario) => (
              <FilaMovil
                key={horario.id}
                titulo={horario.actividadNombre}
                insignia={horario.bajaProgramada ? <InsigniaBajaProgramada /> : undefined}
                detalle={[
                  `${horario.horaInicio} - ${horario.horaFin} hs`,
                  horario.profesoraNombre,
                  horario.actividadTipo === 'PERSONALIZADA' ? 'Personalizada' : 'Grupal',
                  `Cupo ${textoCupo(horario.cupoMaximo)}`,
                ]}
                onAbrir={() => onEdit(horario)}
                acciones={
                  <>
                    <Button type="button" variant="outline" onClick={() => onEdit(horario)} className={BOTON_FILA}>
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onDelete(horario)}
                      className={horario.bajaProgramada ? BOTON_FILA : BOTON_FILA_PELIGRO}
                    >
                      {horario.bajaProgramada ? 'Cancelar baja' : 'Eliminar'}
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
