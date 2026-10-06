import React, { useState } from 'react';
import { OwnerLayout } from '@/components/layout/owner-layout';
import { mensajeDeErrorApi } from '@/api/errores';
import { useHorarios } from '../hooks/useHorarios';
import { CronogramaGridDesktop } from '../components/CronogramaGridDesktop';
import { CronogramaListMobile } from '../components/CronogramaListMobile';
import { HorarioModalForm } from '../components/HorarioModalForm';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { PendingChangesDock } from '@/components/ui/pending-changes-dock';
import type { DiaSemana, Horario, HorarioFormData } from '../../../types/horarios';
import { Filter, RotateCcw, Plus, CalendarX, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

export const HorariosPage: React.FC = () => {
  const {
    cargando,
    errorCarga,
    reintentarCarga,
    horarios,
    totalHorarios,
    actividades,
    profesoras,
    filtroActividad,
    setFiltroActividad,
    filtroProfesora,
    setFiltroProfesora,
    crearHorario,
    editarHorario,
    eliminarHorario,
    moverHorario,
    intercambiarHorarios,
    validarSuperposicion,
    hayCambiosPendientes,
    cantidadCambiosPendientes,
    guardando,
    guardarCambios,
    cancelarCambios,
  } = useHorarios();

  // Estado responsive de filtros en mobile (el menú lateral lo provee OwnerLayout)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // Filtro por modalidad (Grupal / Personalizada)
  const [filtroTipo, setFiltroTipo] = useState<string>('todas');
  const [selectedMobileDay, setSelectedMobileDay] = useState<DiaSemana>('LUNES');

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [horarioEnEdicion, setHorarioEnEdicion] = useState<Horario | null>(null);
  const [diaSugerido, setDiaSugerido] = useState<DiaSemana>('LUNES');
  const [horaSugerida, setHoraSugerida] = useState<string>('08:00');
  const [horarioAEliminar, setHorarioAEliminar] = useState<Horario | null>(null);

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Saber si hay filtros activos
  const isFilterActive =
    filtroActividad !== 'TODAS' || filtroProfesora !== 'TODAS' || filtroTipo !== 'todas';

  const activeFiltersCount =
    (filtroActividad !== 'TODAS' ? 1 : 0) +
    (filtroProfesora !== 'TODAS' ? 1 : 0) +
    (filtroTipo !== 'todas' ? 1 : 0);

  // Filtrado reactivo de horarios
  const horariosMostrados = horarios.filter((h) => {
    if (filtroTipo === 'grupal' && h.actividadTipo !== 'GRUPAL') return false;
    if (filtroTipo === 'personalizada' && h.actividadTipo !== 'PERSONALIZADA') return false;
    return true;
  });

  const resetFilters = () => {
    setFiltroActividad('TODAS');
    setFiltroProfesora('TODAS');
    setFiltroTipo('todas');
    showToast('Filtros restablecidos');
  };

  // Acciones de modal
  const handleOpenCreate = (dia: DiaSemana = 'LUNES', horaInicio: string = '08:00') => {
    if (isFilterActive) {
      setFiltroActividad('TODAS');
      setFiltroProfesora('TODAS');
      setFiltroTipo('todas');
    }
    setHorarioEnEdicion(null);
    setDiaSugerido(dia);
    setHoraSugerida(horaInicio);
    setIsModalOpen(true);
  };

  const handleEdit = (horario: Horario) => {
    setHorarioEnEdicion(horario);
    setIsModalOpen(true);
  };

  const handleSave = (data: HorarioFormData) => {
    if (horarioEnEdicion) {
      const res = editarHorario(horarioEnEdicion.id, data);
      if (res.ok) {
        showToast('Horario modificado en borrador. Presioná "Guardar cambios" para consolidar.');
      }
      return res;
    } else {
      const res = crearHorario(data);
      if (res.ok) {
        showToast('Nuevo horario agregado al borrador. Presioná "Guardar cambios" para consolidar.');
      }
      return res;
    }
  };

  const handleConfirmDelete = async () => {
    if (!horarioAEliminar) return;
    const res = await eliminarHorario(horarioAEliminar.id);
    if (res.ok) {
      showToast(res.advertencia ? `Horario dado de baja. ${res.advertencia}` : 'Horario dado de baja.');
      setIsModalOpen(false);
    } else {
      showToast(`⚠️ ${res.error}`);
    }
    setHorarioAEliminar(null);
  };

  const handleGuardarCambios = async () => {
    const res = await guardarCambios();
    if (res.ok) {
      showToast(`¡Cambios guardados! Se actualizaron ${res.guardados} clases.`);
    } else {
      showToast(`⚠️ ${res.error} Los cambios que no se guardaron siguen en el borrador.`);
    }
  };

  const handleCancelarCambios = () => {
    cancelarCambios();
    showToast('Cambios descartados: se restauró el cronograma oficial.');
  };

  const handleMoveHorario = (
    horarioId: string,
    nuevoDia: DiaSemana,
    nuevaHoraInicio: string,
    slotFin?: string
  ) => {
    const res = moverHorario(horarioId, nuevoDia, nuevaHoraInicio, slotFin);
    if (res.ok) {
      showToast('Clase reubicada en borrador. Presioná "Guardar cambios" para consolidar.');
    } else {
      showToast(`⚠️ ${res.error}`);
    }
  };

  const handleSwapHorarios = (idA: string, idB: string) => {
    const res = intercambiarHorarios(idA, idB);
    if (res.ok) {
      showToast('Clases intercambiadas en borrador. Presioná "Guardar cambios" para consolidar.');
    } else {
      showToast(`⚠️ ${res.error}`);
    }
  };

  if (cargando || errorCarga) {
    return (
      <OwnerLayout>
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
          {cargando ? (
            <>
              <Loader2 aria-hidden="true" className="w-8 h-8 text-[#E91E82] animate-spin" />
              <p className="text-sm font-semibold text-slate-600">Cargando el cronograma…</p>
            </>
          ) : (
            <>
              <p role="alert" className="text-sm font-semibold text-slate-700">
                {mensajeDeErrorApi(errorCarga, 'No se pudo cargar el cronograma.')}
              </p>
              <button
                type="button"
                onClick={reintentarCarga}
                className="min-h-[44px] px-5 rounded-xl bg-[#E91E82] hover:bg-[#BC1266] text-white text-sm font-bold cursor-pointer"
              >
                Reintentar
              </button>
            </>
          )}
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      {/* CONTENIDO PRINCIPAL */}
      <div className="flex flex-col bg-slate-50/50 min-w-0">
        {/* HEADER CON BREADCRUMB */}
        <header className="bg-white border-b border-slate-200 px-4 py-4 md:px-7 md:py-5">
          <div className="flex items-center gap-2 text-sm font-medium mb-1.5 select-none">
            <span className="text-slate-400">MiFR Centro</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-600 font-semibold">Actividades y Horarios</span>
            <span className="text-slate-300">/</span>
            <span className="text-[#E91E82] font-semibold">Horarios</span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3.5 flex-wrap">
                <h1 className="text-2xl xl:text-3xl font-black text-[#181C26] tracking-tight">
                  Horarios
                </h1>
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-pink-50 text-[#E91E82] border border-pink-100 shadow-2xs">
                  {totalHorarios} clases asignadas
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium leading-relaxed">
                Armá y gestioná el cronograma semanal del salón sin superposiciones.
              </p>
            </div>
          </div>
        </header>

        {/* BARRA DE FILTROS RESPONSIVE */}
        <div className="bg-white border-b border-slate-200 px-4 md:px-7 py-3">
          {/* Fila compacta de móvil */}
          <div className="flex items-center justify-between md:hidden">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3.5 py-2 rounded-xl transition cursor-pointer min-h-[44px]"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E91E82] text-white flex items-center justify-center text-xs font-extrabold">
                  {activeFiltersCount}
                </span>
              )}
              {isMobileFiltersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="text-sm font-bold text-[#E91E82] hover:underline cursor-pointer"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Menú de filtros (siempre visible en desktop, colapsable en móvil) */}
          <div
            className={`${
              isMobileFiltersOpen ? 'flex' : 'hidden md:flex'
            } flex-col md:flex-row flex-wrap items-stretch md:items-center justify-start gap-2.5 md:gap-3.5 mt-3 md:mt-0`}
          >
            <div className="hidden md:flex items-center gap-2 text-sm font-bold text-slate-700 mr-1">
              <Filter className="w-4 h-4 text-slate-400" />
              <span>Filtros:</span>
            </div>

            {/* Actividad */}
            <select
              value={filtroActividad}
              onChange={(e) => setFiltroActividad(e.target.value)}
              className="w-full md:w-auto text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors min-h-[44px]"
            >
              <option value="TODAS">Todas las disciplinas ({actividades.length})</option>
              {actividades.map((act) => (
                <option key={act.id} value={act.id}>
                  {act.nombre} ({act.modalidad === 'PERSONALIZADA' ? 'Pers.' : 'Grupal'})
                </option>
              ))}
            </select>

            {/* Profesora */}
            <select
              value={filtroProfesora}
              onChange={(e) => setFiltroProfesora(e.target.value)}
              className="w-full md:w-auto text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors min-h-[44px]"
            >
              <option value="TODAS">Todas las profesoras ({profesoras.length})</option>
              {profesoras.map((prof) => (
                <option key={prof.id} value={prof.id}>
                  {prof.nombre} {prof.apellido}
                </option>
              ))}
            </select>

            {/* Modalidad */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="w-full md:w-auto text-sm font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors min-h-[44px]"
            >
              <option value="todas">Todas las modalidades</option>
              <option value="grupal">Solo Grupales</option>
              <option value="personalizada">Solo Personalizadas</option>
            </select>

            {isFilterActive && (
              <button
                onClick={resetFilters}
                className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold text-[#E91E82] hover:text-[#BC1266] px-3 py-2 rounded-xl hover:bg-pink-50 transition cursor-pointer min-h-[44px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            )}

            {isFilterActive && (
              <span className="hidden md:inline-flex text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl ml-auto">
                Modo consulta activo
              </span>
            )}
          </div>
        </div>

        {/* REFERENCIA DE COLORES: salen de la modalidad de la actividad */}
        <div className="px-4 md:px-7 py-2.5 bg-white/80 border-b border-slate-200 flex items-center gap-4 text-sm font-bold text-slate-600">
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3 h-3 rounded-full bg-[#3B82F6]" />
            Grupal
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
            Personalizada
          </span>
        </div>

        {/* ÁREA DE CONTENIDO / CRONOGRAMA */}
        <main className={`p-3 sm:p-5 md:p-6 overflow-y-auto flex-1 ${hayCambiosPendientes ? 'pb-28' : ''}`}>
          <div className="max-w-[1380px] mx-auto w-full">
            {/* ACCIÓN PRINCIPAL: la confirmación vive en el dock flotante inferior */}
            <div className="hidden md:flex flex-wrap items-center justify-between gap-3 mb-5">
              <button
                type="button"
                onClick={() => handleOpenCreate('LUNES', '08:00')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-[#E91E82] to-[#BC1266] hover:from-[#BC1266] hover:to-[#900e4e] shadow-xs hover:shadow-md transition cursor-pointer min-h-[44px]"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nuevo Horario</span>
              </button>
            </div>

            {/* MENSAJE CUANDO EL CRONOGRAMA ESTÁ VACÍO */}
            {totalHorarios === 0 ? (
              <div className="mb-5 bg-gradient-to-r from-amber-50/90 via-white to-pink-50/70 border border-amber-200/90 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <CalendarX className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-slate-900">
                        Cronograma vacío
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        Sin clases activas
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                      Actualmente no hay ninguna clase programada. Asigná la primera clase semanal haciendo clic en <strong>"+ Nueva clase"</strong>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleOpenCreate('LUNES', '08:00')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-[#E91E82] hover:bg-[#BC1266] transition shadow-xs cursor-pointer shrink-0 min-h-[44px]"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Asignar primera clase</span>
                </button>
              </div>
            ) : isFilterActive && horariosMostrados.length === 0 ? (
              <div className="mb-5 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-sm text-slate-600">
                <p>
                  No se encontraron clases programadas con los filtros seleccionados.
                </p>
                <button
                  onClick={resetFilters}
                  className="text-sm font-bold text-[#E91E82] hover:underline cursor-pointer"
                >
                  Restablecer filtros
                </button>
              </div>
            ) : null}

            {/* VISTA DESKTOP (GRILLA SEMANAL CON DRAG & DROP) */}
            <div className="hidden md:block">
              <CronogramaGridDesktop
                horarios={horariosMostrados}
                todosLosHorarios={horarios}
                onEdit={handleEdit}
                onDelete={(h) => setHorarioAEliminar(h)}
                onAddForCell={(dia, inicio) => handleOpenCreate(dia, inicio)}
                onMoveHorario={handleMoveHorario}
                onSwapHorarios={handleSwapHorarios}
                isFilterActive={isFilterActive}
              />
            </div>

            {/* VISTA MOBILE (LISTA TOUCH DIARIA, SIN ARRASTRE) */}
            <div className="block md:hidden bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <CronogramaListMobile
                horarios={horariosMostrados}
                onEdit={handleEdit}
                onDelete={(h) => setHorarioAEliminar(h)}
                onAddForDay={(dia) => handleOpenCreate(dia, '08:00')}
                selectedDay={selectedMobileDay}
                setSelectedDay={setSelectedMobileDay}
                isFilterActive={isFilterActive}
              />
            </div>
          </div>
        </main>
      </div>

      {/* MODAL: ALTA / EDICIÓN (se desmonta al cerrar: cada apertura parte de valores frescos) */}
      {isModalOpen && (
        <HorarioModalForm
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          onValidate={validarSuperposicion}
          onDelete={() => {
            if (horarioEnEdicion) {
              setHorarioAEliminar(horarioEnEdicion);
            }
          }}
          actividades={actividades}
          profesoras={profesoras}
          horarioEnEdicion={horarioEnEdicion}
          diaSugerido={diaSugerido}
          horaSugerida={horaSugerida}
        />
      )}

      {/* MODAL: ELIMINACIÓN */}
      <ConfirmDeleteModal
        isOpen={Boolean(horarioAEliminar)}
        horario={horarioAEliminar}
        onClose={() => setHorarioAEliminar(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      {/* DOCK FLOTANTE DE CAMBIOS PENDIENTES (único punto de confirmación) */}
      {hayCambiosPendientes && (
        <PendingChangesDock
          cantidad={cantidadCambiosPendientes}
          guardando={guardando}
          onGuardar={() => void handleGuardarCambios()}
          onDescartar={handleCancelarCambios}
        />
      )}

      {/* TOAST DE FEEDBACK (se eleva cuando el dock está visible) */}
      {toastMessage && (
        <div className={`fixed right-6 z-50 bg-[#181C26] text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-sm font-semibold animate-fadeIn max-w-[90vw] ${hayCambiosPendientes ? 'bottom-24' : 'bottom-6'}`}>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </OwnerLayout>
  );
};
