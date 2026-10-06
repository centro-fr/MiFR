import React, { useMemo, useState, useRef } from 'react';
import type { DiaSemana, Horario } from '../../../types/horarios';
import { timeToMinutes } from '../utils/cronograma';
import { textoCupo } from '../utils/cupo';
import { Plus, Pencil, Trash2, ArrowLeftRight, Move } from 'lucide-react';

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

// 6 Columnas (Lunes a Sábado).
const DIAS_COLUMNAS: { id: DiaSemana; label: string }[] = [
  { id: 'LUNES', label: 'Lunes' },
  { id: 'MARTES', label: 'Martes' },
  { id: 'MIERCOLES', label: 'Miércoles' },
  { id: 'JUEVES', label: 'Jueves' },
  { id: 'VIERNES', label: 'Viernes' },
  { id: 'SABADO', label: 'Sábado' },
];

// Límites permitidos del negocio
const HORA_MIN_PERMITIDA = 7;
const HORA_MAX_PERMITIDA = 20;

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

    let minHora = 20;
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
        {/* Cabecera de días */}
        <div className="grid grid-cols-[130px_repeat(6,1fr)] border-b border-slate-200 bg-slate-50/95 sticky top-0 z-20">
          <div className="p-3 text-center border-r border-slate-200 text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center">
            Horario
          </div>
          {DIAS_COLUMNAS.map((dia) => (
            <div
              key={dia.id}
              className="p-3 text-center border-r last:border-r-0 border-slate-200 flex items-center justify-center"
            >
              <span className="text-sm font-bold uppercase tracking-wider text-slate-800">
                {dia.label}
              </span>
            </div>
          ))}
        </div>

        {/* Estado vacío sin franjas */}
        <div className="py-16 px-6 text-center bg-slate-50/30 flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3 shadow-2xs">
            <Plus className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            Cronograma sin franjas horarias
          </p>
          <p className="text-sm text-slate-500 max-w-sm mt-1 leading-relaxed">
            No hay clases asignadas actualmente. El rango horario del cronograma se ajustará automáticamente a partir del horario de la primera clase que agregues.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          {/* Cabecera de días */}
          <div className="grid grid-cols-[130px_repeat(6,1fr)] border-b border-slate-200 bg-slate-50/95 sticky top-0 z-20">
        <div className="p-3 text-center border-r border-slate-200 text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center justify-center">
          Horario
        </div>
        {DIAS_COLUMNAS.map((dia) => (
          <div
            key={dia.id}
            className="p-3 text-center border-r last:border-r-0 border-slate-200 flex items-center justify-center"
          >
            <span className="text-sm font-bold uppercase tracking-wider text-slate-800">
              {dia.label}
            </span>
          </div>
        ))}
      </div>

      {/* Grilla: horas y columnas de días */}
      <div className="grid grid-cols-[130px_repeat(6,1fr)] text-sm">
        {/* COLUMNA 0: ETIQUETAS DE HORAS */}
        <div
          className="border-r border-slate-200/60 bg-slate-50/70 select-none grid"
          style={{ gridTemplateRows: `repeat(${totalSlots}, 104px)` }}
        >
          {franjasHorarias.map((franja) => (
            <div
              key={franja.label}
              className="h-[104px] p-2 text-center font-bold text-[#181C26] text-sm border-b border-slate-100 flex items-center justify-center"
            >
              {franja.label}
            </div>
          ))}
        </div>

        {/* COLUMNAS 1 A 6: DÍAS (LUNES A SÁBADO) */}
        {DIAS_COLUMNAS.map((dia) => (
          <div
            key={dia.id}
            className="border-r last:border-r-0 border-slate-200/60 grid relative"
            style={{ gridTemplateRows: `repeat(${totalSlots}, 104px)` }}
          >
            {franjasHorarias.map((franja, slotIndex) => {
              const slotInicio = timeToMinutes(franja.inicio);
              const slotFin = timeToMinutes(franja.fin);

              // Buscar horario activo en este día que cubra este slot
              const horarioEnSlot = horarios.find(
                (h) =>
                  h.diaSemana === dia.id &&
                  timeToMinutes(h.horaInicio) < slotFin &&
                  timeToMinutes(h.horaFin) > slotInicio
              );

              if (horarioEnSlot) {
                // Verificar si es el primer slot visible cubierto por este horario en la grilla
                const primerSlotIndex = Math.max(
                  0,
                  Math.floor((timeToMinutes(horarioEnSlot.horaInicio) - baseMinutos) / 60)
                );
                const isFirstSlot = slotIndex === primerSlotIndex;

                // Si no es el primer slot, omitir render (el span de arriba ya ocupa la fila)
                if (!isFirstSlot) {
                  return null;
                }

                // Calcular cuántos slots continuos abarca dentro del rango visible
                const lastSlotIndex = Math.min(
                  totalSlots - 1,
                  Math.floor((timeToMinutes(horarioEnSlot.horaFin) - 1 - baseMinutos) / 60)
                );
                const spanCount = Math.max(1, lastSlotIndex - slotIndex + 1);
                const isSingleSlot = spanCount === 1;
                const theme = horarioEnSlot.tema;

                return (
                  <div
                    key={`hor-${horarioEnSlot.id}`}
                    style={{ gridRow: `span ${spanCount}` }}
                    className="p-1.5 h-full w-full"
                  >
                    <div
                      draggable={!isFilterActive}
                      onDragStart={(e) => {
                        if (isFilterActive) return;

                        // Calcular si el usuario agarró la primera franja o una inferior (ej: 2da hora)
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickY = e.clientY - rect.top;
                        const slotHeight = rect.height / Math.max(1, spanCount);
                        const offset = Math.max(0, Math.min(spanCount - 1, Math.floor(clickY / slotHeight)));
                        const duracionMinutos = timeToMinutes(horarioEnSlot.horaFin) - timeToMinutes(horarioEnSlot.horaInicio);

                        const dragInfo: DragHorarioInfo = {
                          id: horarioEnSlot.id,
                          offset,
                          duracionMinutos,
                          diaOrigen: horarioEnSlot.diaSemana,
                          horaInicioOrigen: horarioEnSlot.horaInicio,
                          horaFinOrigen: horarioEnSlot.horaFin,
                        };

                        dragInfoRef.current = dragInfo;
                        e.dataTransfer.setData('text/plain', horarioEnSlot.id);
                        e.dataTransfer.setData('application/json', JSON.stringify(dragInfo));
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedHorarioId(horarioEnSlot.id);
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
                          if (currentDraggedId && currentDraggedId !== horarioEnSlot.id) {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverCardId !== horarioEnSlot.id) {
                              setDragOverCardId(horarioEnSlot.id);
                            }
                          }
                        }
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          if (dragOverCardId === horarioEnSlot.id) {
                            setDragOverCardId(null);
                          }
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const idA = dragInfoRef.current?.id || e.dataTransfer.getData('text/plain') || draggedHorarioId;
                        if (idA && idA !== horarioEnSlot.id && onSwapHorarios) {
                          onSwapHorarios(idA, horarioEnSlot.id);
                        }
                        dragInfoRef.current = null;
                        setDragOverCardId(null);
                        setDraggedHorarioId(null);
                      }}
                      onClick={() => onEdit(horarioEnSlot)}
                      className={`h-full w-full rounded-2xl flex flex-col justify-between hover:shadow-lg transition-all duration-200 cursor-grab active:cursor-grabbing border-0 shadow-xs group relative overflow-hidden select-none ${
                        isSingleSlot ? 'p-2.5' : 'p-3.5'
                      } ${
                        draggedHorarioId === horarioEnSlot.id
                          ? 'opacity-30 scale-95 border-2 border-dashed border-[#E91E82]'
                          : ''
                      } ${
                        dragOverCardId === horarioEnSlot.id
                          ? 'ring-4 ring-[#E91E82] scale-[1.02] shadow-xl'
                          : 'hover:-translate-y-0.5'
                      }`}
                      style={{
                        backgroundColor: theme.bg,
                      }}
                    >
                      {/* Overlay al arrastrar sobre esta tarjeta para Swap (con pointer-events-none para no romper drag) */}
                      <div
                        className={`absolute inset-0 bg-[#E91E82]/95 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-white p-2 text-center pointer-events-none transition-opacity duration-150 ${
                          dragOverCardId === horarioEnSlot.id ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <ArrowLeftRight className="w-5 h-5 mb-1 animate-bounce" />
                        <span className="text-xs font-black leading-tight">Soltar para intercambiar</span>
                        <span className="text-xs font-semibold text-pink-100">Swap de horarios</span>
                      </div>

                      {/* Contenido de la tarjeta */}
                      {isSingleSlot ? (
                        <div className="flex-1 flex flex-col justify-between pointer-events-none min-h-0">
                          {/* Cabecera compacta 1 hora */}
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 min-w-0">
                              <span
                                 className="font-black uppercase rounded-md truncate shadow-2xs text-xs px-1.5 py-0.5 max-w-[110px]"
                                style={{
                                  backgroundColor: theme.badgeBg,
                                  color: theme.badgeText,
                                }}
                              >
                                {horarioEnSlot.profesoraNombre}
                              </span>
                              {!isFilterActive && (
                                <span
                                  className="text-slate-400 group-hover:text-slate-600 transition"
                                  title="Arrastrá para mover a otra celda o sobre otra clase para intercambiar"
                                >
                                  <Move className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 pointer-events-auto">
                              <span className="font-extrabold text-slate-800 tracking-tight text-[10.5px]">
                                {horarioEnSlot.horaInicio} - {horarioEnSlot.horaFin} hs
                              </span>
                              <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(horarioEnSlot);
                                  }}
                                  className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-[#E91E82] shadow-2xs transition cursor-pointer"
                                  title="Editar horario"
                                  aria-label="Editar horario"
                                >
                                  <Pencil className="w-2.5 h-2.5 stroke-[2.5]" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(horarioEnSlot);
                                  }}
                                  className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 shadow-2xs transition cursor-pointer"
                                  title="Eliminar horario"
                                  aria-label="Eliminar horario"
                                >
                                  <Trash2 className="w-2.5 h-2.5 stroke-[2.5]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Fila inferior: Nombre de actividad (izq) y Cupos (der) */}
                          <div className="flex items-end justify-between gap-1.5 mt-auto pt-1">
                            <div className="min-w-0 flex-1">
                              <h4 className="font-black text-slate-900 text-sm leading-tight truncate">
                                {horarioEnSlot.actividadNombre}
                              </h4>
                              <p className="font-semibold text-slate-700 truncate text-xs">
                                {horarioEnSlot.actividadTipo === 'PERSONALIZADA'
                                  ? 'Personalizada 1:1'
                                  : 'Clase Grupal'}
                              </p>
                            </div>

                            {/* Cupo alineado a la derecha */}
                            <div className="text-right shrink-0 bg-white/80 backdrop-blur-2xs px-2 py-0.5 rounded-lg border border-black/5 shadow-2xs">
                              <div className="text-xs font-bold text-slate-700 leading-tight">
                                Cupo: <strong className="text-slate-900">{textoCupo(horarioEnSlot.cupoMaximo)}</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Multislot (>= 2 horas): diseño espacioso vertical */
                        <>
                          <div className="pointer-events-none">
                            {/* Cabecera de la tarjeta */}
                            <div className="flex items-center justify-between gap-1 flex-wrap mb-1.5">
                              <div className="flex items-center gap-1 min-w-0">
                                <span
                                   className="font-black uppercase rounded-md truncate shadow-2xs text-xs px-2 py-0.5 max-w-[130px]"
                                  style={{
                                    backgroundColor: theme.badgeBg,
                                    color: theme.badgeText,
                                  }}
                                >
                                  {horarioEnSlot.profesoraNombre}
                                </span>
                                {!isFilterActive && (
                                  <span
                                    className="text-slate-400 group-hover:text-slate-600 transition"
                                    title="Arrastrá para mover a otra celda o sobre otra clase para intercambiar"
                                  >
                                    <Move className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 pointer-events-auto">
                                <span className="font-extrabold text-slate-800 tracking-tight text-xs">
                                  {horarioEnSlot.horaInicio} - {horarioEnSlot.horaFin} hs
                                </span>
                                <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onEdit(horarioEnSlot);
                                    }}
                                    className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-[#E91E82] shadow-2xs transition cursor-pointer"
                                    title="Editar horario"
                                    aria-label="Editar horario"
                                  >
                                    <Pencil className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDelete(horarioEnSlot);
                                    }}
                                    className="p-1 rounded bg-white/80 hover:bg-white text-slate-600 hover:text-red-600 shadow-2xs transition cursor-pointer"
                                    title="Eliminar horario"
                                    aria-label="Eliminar horario"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 stroke-[2.5]" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <h4 className="font-black text-slate-900 leading-snug text-sm line-clamp-2">
                              {horarioEnSlot.actividadNombre}
                            </h4>
                             <p className="font-semibold text-slate-700 truncate text-xs mt-0.5">
                              {horarioEnSlot.actividadTipo === 'PERSONALIZADA'
                                ? 'Personalizada 1:1'
                                : 'Clase Grupal'}
                            </p>
                          </div>

                          {/* Pie de tarjeta multislot */}
                           <div className="flex items-center border-t border-black/10 mt-auto font-medium pointer-events-none text-xs pt-2">
                            <span className="text-slate-700">
                              Cupo: <strong className="text-slate-900 font-bold">{textoCupo(horarioEnSlot.cupoMaximo)}</strong>
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              }

              // Celda libre: cuando hay filtro activo (modo consulta), queda limpia
              if (isFilterActive) {
                return (
                  <div
                    key={`free-${dia.id}-${franja.inicio}`}
                    style={{ gridRow: 'span 1' }}
                    className="h-[104px] p-1.5 border-b border-slate-100 bg-slate-50/20 select-none"
                  />
                );
              }

              // Celda libre editable sin filtros (admite clic para crear o drop para mover)
              const cellKey = `cell-${dia.id}-${franja.inicio}`;
              const isOverCell = dragOverCellKey === cellKey;

              return (
                <div
                  key={`free-${dia.id}-${franja.inicio}`}
                  style={{ gridRow: 'span 1' }}
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

                    // Recuperar datos síncronos del drag
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

                        // CASO 1: Movimiento inteligente contiguo hacia abajo en el mismo día
                        // Si la celda libre soltada es contigua al final de la clase (ej: clase 11-13 y celda 13-14),
                        // el usuario busca extender/bajar la clase a esa celda libre -> se alinea a (fin - duración = 12:00 a 14:00)
                        if (esMismoDia && dropMins === finOrigenMins && duracionMins > 60) {
                          const adjustedMins = dropFinMins - duracionMins;
                          if (adjustedMins >= timeToMinutes('07:00')) {
                            horaInicioFinal = `${Math.floor(adjustedMins / 60)
                              .toString()
                              .padStart(2, '0')}:${(adjustedMins % 60).toString().padStart(2, '0')}`;
                          }
                        }
                        // CASO 2: Movimiento inteligente contiguo hacia arriba en el mismo día
                        // Si la celda libre soltada es contigua al inicio de la clase (ej: clase 14-16 y celda 13-14),
                        // el usuario busca subir la clase a esa celda libre -> hora inicio es franja.inicio (13:00)
                        else if (esMismoDia && dropFinMins === inicioOrigenMins) {
                          horaInicioFinal = franja.inicio;
                        }
                        // CASO 3: Movimiento general con offset del slot agarrado
                        else if (dragInfo.offset > 0) {
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
                  className={`h-[104px] p-1.5 border-b border-slate-100 group transition relative flex items-center justify-center cursor-pointer select-none ${
                    isOverCell
                      ? 'bg-pink-100/90 border-2 border-dashed border-[#E91E82]'
                      : 'hover:bg-slate-100/60'
                  }`}
                  title={
                    isOverCell
                      ? `Soltar para mover clase al ${dia.label} a las ${franja.inicio}`
                      : `Asignar clase el ${dia.label} (${franja.label})`
                  }
                >
                  {/* Indicador visual de soltar */}
                  <div
                    className={`absolute inset-1 rounded-xl bg-pink-100/95 border-2 border-dashed border-[#E91E82] flex flex-col items-center justify-center text-[#E91E82] font-black text-xs gap-1 pointer-events-none transition-all duration-150 z-10 ${
                      isOverCell ? 'opacity-100 scale-100 shadow-inner' : 'opacity-0 scale-95'
                    }`}
                  >
                    <Move className="w-5 h-5 stroke-[2.5]" />
                    <span>Mover clase aquí</span>
                  </div>

                  {/* Botón de creación en hover */}
                  <button
                    type="button"
                    className={`w-7 h-7 rounded-full bg-[#E91E82]/15 text-[#E91E82] font-black flex items-center justify-center shadow-xs transition pointer-events-none ${
                      isOverCell ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
          </div>
        </div>
      </div>
    </div>
  );
};
