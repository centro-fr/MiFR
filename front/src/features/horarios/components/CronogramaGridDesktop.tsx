import React, { useMemo, useState, useRef } from 'react';
import type { DiaSemana, Horario } from '../../../types/horarios';
import { timeToMinutes } from '../utils/cronograma';
import { Plus, ArrowLeftRight, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TarjetaHorario } from './TarjetaHorario';

interface CronogramaGridDesktopProps {
  horarios: Horario[];
  todosLosHorarios?: Horario[];
  onEdit: (horario: Horario) => void;
  onDelete: (horario: Horario) => void;
  onAddForCell: (dia: DiaSemana, horaInicio: string, horaFin: string) => void;
  onMoveHorario?: (horarioId: string, nuevoDia: DiaSemana, nuevaHoraInicio: string, slotFin?: string) => void;
  onSwapHorarios?: (horarioIdA: string, horarioIdB: string) => void;
  isFilterActive?: boolean; // Si hay filtro activo, solo consulta
}

interface DragHorarioInfo {
  id: string;
  offset: number;
  duracionMinutos: number;
  diaOrigen: DiaSemana;
  horaInicioOrigen: string;
  horaFinOrigen: string;
}

// 5 Columnas (Lunes a Viernes)
const DIAS_COLUMNAS: { id: DiaSemana; label: string }[] = [
  { id: 'LUNES', label: 'Lunes' },
  { id: 'MARTES', label: 'Martes' },
  { id: 'MIERCOLES', label: 'Miércoles' },
  { id: 'JUEVES', label: 'Jueves' },
  { id: 'VIERNES', label: 'Viernes' },
];

// Límites permitidos del negocio
const HORA_MIN_PERMITIDA = 7;
const HORA_MAX_PERMITIDA = 23;

export const CronogramaGridDesktop: React.FC<CronogramaGridDesktopProps> = ({
  horarios,
  todosLosHorarios,
  onEdit,
  onDelete,
  onAddForCell,
  onMoveHorario,
  onSwapHorarios,
  isFilterActive = false,
}) => {
  const [draggedHorarioId, setDraggedHorarioId] = useState<string | null>(null);
  const [dragOverCellKey, setDragOverCellKey] = useState<string | null>(null);
  const [dragOverCardId, setDragOverCardId] = useState<string | null>(null);
  const dragInfoRef = useRef<DragHorarioInfo | null>(null);
  // Generar franjas horarias dinámicas según los horarios ingresados respetando los límites
  const franjasHorarias = useMemo(() => {
    const fuenteHorarios = (todosLosHorarios && todosLosHorarios.length > 0) ? todosLosHorarios : horarios;

    // Si no hay horarios cargados, el rango queda completamente vacío (no se abre de 9 a 18)
    if (fuenteHorarios.length === 0) {
      return [];
    }

    let minHora = 23;
    let maxHora = 7;

    fuenteHorarios.forEach((h) => {
      const startMins = timeToMinutes(h.horaInicio);
      const endMins = timeToMinutes(h.horaFin);
      const startHour = Math.floor(startMins / 60);
      const endHour = Math.ceil(endMins / 60);

      if (startHour < minHora) minHora = startHour;
      if (endHour > maxHora) maxHora = endHour;
    });

    // Acotar estrictamente dentro de los límites [07:00, 20:00]
    minHora = Math.max(HORA_MIN_PERMITIDA, minHora);
    maxHora = Math.min(HORA_MAX_PERMITIDA, maxHora);

    if (minHora >= maxHora) {
      maxHora = Math.min(HORA_MAX_PERMITIDA, minHora + 1);
    }

    const franjas = [];
    for (let h = minHora; h < maxHora; h++) {
      const inicio = `${h.toString().padStart(2, '0')}:00`;
      const fin = `${(h + 1).toString().padStart(2, '0')}:00`;
      franjas.push({ inicio, fin, label: `${inicio} - ${fin}` });
    }
    return franjas;
  }, [horarios, todosLosHorarios]);

  const baseMinutos = franjasHorarias.length > 0 ? timeToMinutes(franjasHorarias[0].inicio) : 0;
  const totalSlots = franjasHorarias.length;

  if (totalSlots === 0) {
    return (
      <div className="w-full rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs overflow-hidden">
        {/* Cabecera de días */}
        <div className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] bg-slate-100/70 dark:bg-slate-900/80 sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800">
          <div className="p-3 text-center border-r border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center">
            <span className="sr-only">Horario</span>
          </div>
          {DIAS_COLUMNAS.map((dia) => (
            <div
              key={dia.id}
              className="p-3 px-3.5 text-left border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
            >
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                {dia.label}
              </span>
              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                0
              </span>
            </div>
          ))}
        </div>

        {/* Estado vacío sin franjas */}
        <div className="py-16 px-6 text-center bg-white dark:bg-slate-900/20 flex flex-col items-center justify-center">
          <p className="text-sm font-bold text-slate-900 dark:text-white">
            Cronograma sin franjas horarias
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 leading-relaxed">
            No hay clases asignadas actualmente. El rango horario del cronograma se ajustará automáticamente a partir del horario de la primera clase que agregues.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Cabecera de días */}
          <div className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] bg-slate-100/70 dark:bg-slate-900/80 sticky top-0 z-20 border-b border-slate-200/80 dark:border-slate-800">
            <div className="p-3 text-center border-r border-slate-200/80 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-center">
              <span className="sr-only">Horario</span>
            </div>
            {DIAS_COLUMNAS.map((dia) => {
              const cantidadDia = horarios.filter((h) => h.diaSemana === dia.id).length;
              return (
                <div
                  key={dia.id}
                  className="p-3 px-3.5 text-left border-r last:border-r-0 border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
                >
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {dia.label}
                  </span>
                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {cantidadDia}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Grilla: horas y columnas de días */}
          <div className="grid grid-cols-[80px_repeat(5,minmax(0,1fr))] text-sm">
            {/* COLUMNA 0: ETIQUETAS DE HORAS */}
            <div
              className="border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 select-none grid"
              style={{ gridTemplateRows: `repeat(${totalSlots}, 104px)` }}
            >
              {franjasHorarias.map((franja) => (
                <div
                  key={franja.label}
                  className="h-[104px] px-2 text-center font-bold text-slate-400 dark:text-slate-500 text-xs sm:text-sm flex items-start justify-center pt-2.5 whitespace-nowrap border-b border-slate-200/60 dark:border-slate-800/60"
                >
                  <span>{franja.inicio}</span>
                </div>
              ))}
            </div>

            {/* COLUMNAS 1 A 5: DÍAS (LUNES A VIERNES) */}
            {DIAS_COLUMNAS.map((dia) => {
              const horariosDelDia = horarios.filter((h) => h.diaSemana === dia.id);

              return (
                <div
                  key={dia.id}
                  className="border-r last:border-r-0 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/20 relative"
                  style={{ height: `${totalSlots * 104}px` }}
                >
                  {/* CAPA 1: CELDAS LIBRES / DROP TARGETS */}
                  {franjasHorarias.map((franja, slotIndex) => {
                    const cellKey = `cell-${dia.id}-${franja.inicio}`;
                    const isOverCell = dragOverCellKey === cellKey;

                    if (isFilterActive) {
                      return (
                        <div
                          key={`free-${dia.id}-${franja.inicio}`}
                          style={{
                            position: 'absolute',
                            top: `${slotIndex * 104}px`,
                            left: 0,
                            right: 0,
                            height: '104px',
                          }}
                          className="p-1.5 border-b border-slate-200/60 dark:border-slate-800/60 bg-transparent select-none"
                        />
                      );
                    }

                    return (
                      <div
                        key={`free-${dia.id}-${franja.inicio}`}
                        style={{
                          position: 'absolute',
                          top: `${slotIndex * 104}px`,
                          left: 0,
                          right: 0,
                          height: '104px',
                        }}
                        onDragOver={(e) => {
                          if (!isFilterActive) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverCellKey !== cellKey) {
                              setDragOverCellKey(cellKey);
                            }
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                            if (dragOverCellKey === cellKey) {
                              setDragOverCellKey(null);
                            }
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          let dragInfo = dragInfoRef.current;
                          if (!dragInfo) {
                            try {
                              const rawJson = e.dataTransfer.getData('application/json');
                              if (rawJson) dragInfo = JSON.parse(rawJson);
                            } catch {
                              // Fallback silencioso
                            }
                          }

                          const draggedId = dragInfo?.id || e.dataTransfer.getData('text/plain') || draggedHorarioId;

                          if (draggedId && onMoveHorario) {
                            const dropMins = timeToMinutes(franja.inicio);
                            const dropFinMins = timeToMinutes(franja.fin);
                            let horaInicioFinal = franja.inicio;

                            if (dragInfo) {
                              const duracionMins = dragInfo.duracionMinutos;
                              const esMismoDia = dragInfo.diaOrigen === dia.id;
                              const finOrigenMins = timeToMinutes(dragInfo.horaFinOrigen);
                              const inicioOrigenMins = timeToMinutes(dragInfo.horaInicioOrigen);

                              if (esMismoDia && dropMins === finOrigenMins && duracionMins > 60) {
                                const adjustedMins = dropFinMins - duracionMins;
                                if (adjustedMins >= timeToMinutes('07:00')) {
                                  horaInicioFinal = `${Math.floor(adjustedMins / 60)
                                    .toString()
                                    .padStart(2, '0')}:${(adjustedMins % 60).toString().padStart(2, '0')}`;
                                }
                              } else if (esMismoDia && dropFinMins === inicioOrigenMins) {
                                horaInicioFinal = franja.inicio;
                              } else if (dragInfo.offset > 0) {
                                const adjustedMins = dropMins - (dragInfo.offset * 60);
                                if (adjustedMins >= timeToMinutes('07:00')) {
                                  horaInicioFinal = `${Math.floor(adjustedMins / 60)
                                    .toString()
                                    .padStart(2, '0')}:${(adjustedMins % 60).toString().padStart(2, '0')}`;
                                }
                              }
                            }

                            onMoveHorario(draggedId, dia.id, horaInicioFinal, franja.fin);
                          }

                          dragInfoRef.current = null;
                          setDragOverCellKey(null);
                          setDraggedHorarioId(null);
                        }}
                        onClick={() => onAddForCell(dia.id, franja.inicio, franja.fin)}
                        className={`group transition flex items-center justify-center cursor-pointer select-none border-b border-slate-200/60 dark:border-slate-800/60 ${isOverCell
                            ? 'bg-pink-100/90 dark:bg-[#3b1230] border-2 border-dashed border-primary z-20'
                            : 'hover:bg-slate-50/70 dark:hover:bg-white/5'
                          }`}
                        title={
                          isOverCell
                            ? `Soltar para mover clase al ${dia.label} a las ${franja.inicio}`
                            : `Asignar clase el ${dia.label} (${franja.label})`
                        }
                      >
                        <div
                          className={`absolute inset-1 rounded-xl bg-pink-100/95 dark:bg-[#3b1230] border-2 border-dashed border-primary flex flex-col items-center justify-center text-primary font-black text-sm gap-1 pointer-events-none transition-all duration-150 z-10 ${isOverCell ? 'opacity-100 scale-100 shadow-inner' : 'opacity-0 scale-95'
                            }`}
                        >
                          <Move className="w-5 h-5 stroke-[2.5]" />
                          <span>Mover clase aquí</span>
                        </div>

                        <Button
                          type="button"
                          size="icon"
                          tabIndex={-1}
                          aria-hidden="true"
                          className={`pointer-events-none h-7 w-7 rounded-full bg-primary/15 font-black text-primary shadow-xs transition [&_svg]:size-4 ${isOverCell ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                            }`}
                        >
                          <Plus className="w-4 h-4 stroke-[3]" />
                        </Button>
                      </div>
                    );
                  })}

                  {/* CAPA 2: HORARIOS ASIGNADOS (TARJETAS) */}
                  {horariosDelDia.map((h) => {
                    const startMins = timeToMinutes(h.horaInicio);
                    const endMins = timeToMinutes(h.horaFin);
                    const duracionMins = endMins - startMins;

                    // 104px por cada 60 minutos de franja horaria
                    const topPx = (startMins - baseMinutos) * (104 / 60);
                    const heightPx = duracionMins * (104 / 60);
                    const isCompact = heightPx <= 110 || duracionMins <= 60;

                    return (
                      <div
                        key={`hor-${h.id}`}
                        style={{
                          position: 'absolute',
                          top: `${topPx + 2}px`,
                          height: `${heightPx - 4}px`,
                          left: '3px',
                          right: '3px',
                          zIndex: 10,
                        }}
                        className="transition-all duration-150"
                      >
                        <div
                          draggable={!isFilterActive}
                          onDragStart={(e) => {
                            if (isFilterActive) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const clickY = e.clientY - rect.top;
                            const slotCount = Math.max(1, Math.round(duracionMins / 60));
                            const slotHeight = rect.height / slotCount;
                            const offset = Math.max(0, Math.min(slotCount - 1, Math.floor(clickY / slotHeight)));

                            const dragInfo: DragHorarioInfo = {
                              id: h.id,
                              offset,
                              duracionMinutos: duracionMins,
                              diaOrigen: h.diaSemana,
                              horaInicioOrigen: h.horaInicio,
                              horaFinOrigen: h.horaFin,
                            };

                            dragInfoRef.current = dragInfo;
                            e.dataTransfer.setData('text/plain', h.id);
                            e.dataTransfer.setData('application/json', JSON.stringify(dragInfo));
                            e.dataTransfer.effectAllowed = 'move';
                            setDraggedHorarioId(h.id);
                          }}
                          onDragEnd={() => {
                            dragInfoRef.current = null;
                            setDraggedHorarioId(null);
                            setDragOverCardId(null);
                            setDragOverCellKey(null);
                          }}
                          onDragOver={(e) => {
                            if (!isFilterActive) {
                              const currentDraggedId = dragInfoRef.current?.id || draggedHorarioId;
                              if (currentDraggedId && currentDraggedId !== h.id) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dragOverCardId !== h.id) {
                                  setDragOverCardId(h.id);
                                }
                              }
                            }
                          }}
                          onDragLeave={(e) => {
                            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                              if (dragOverCardId === h.id) {
                                setDragOverCardId(null);
                              }
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const idA = dragInfoRef.current?.id || e.dataTransfer.getData('text/plain') || draggedHorarioId;
                            if (idA && idA !== h.id && onSwapHorarios) {
                              onSwapHorarios(idA, h.id);
                            }
                            dragInfoRef.current = null;
                            setDragOverCardId(null);
                            setDraggedHorarioId(null);
                          }}
                          onClick={() => onEdit(h)}
                          className={`h-full w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-2xs hover:shadow-sm hover:border-primary/50 transition-all duration-200 cursor-grab active:cursor-grabbing group relative overflow-hidden select-none ${
                            draggedHorarioId === h.id
                              ? 'opacity-30 scale-95 border-2 border-dashed border-primary'
                              : ''
                          } ${
                            dragOverCardId === h.id
                              ? 'ring-4 ring-primary scale-[1.02] shadow-xl'
                              : 'hover:-translate-y-0.5'
                          }`}
                        >
                          <div
                            className={`absolute inset-0 bg-primary/95 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-white p-2 text-center pointer-events-none transition-opacity duration-150 ${dragOverCardId === h.id ? 'opacity-100' : 'opacity-0'
                              }`}
                          >
                            <ArrowLeftRight className="w-5 h-5 mb-1 animate-bounce" />
                            <span className="text-sm font-black leading-tight">Soltar para intercambiar</span>
                            <span className="text-sm font-semibold text-pink-100">Swap de horarios</span>
                          </div>

                          <TarjetaHorario
                            horario={h}
                            esCompacta={isCompact}
                            isFilterActive={isFilterActive}
                            onEdit={onEdit}
                            onDelete={onDelete}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
