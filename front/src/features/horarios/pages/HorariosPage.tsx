import React, { useState } from 'react';
import { OwnerLayout } from '@/components/layout/owner-layout';
import { mensajeDeErrorApi } from '@/api/errores';
import { useHorarios } from '../hooks/useHorarios';
import { CronogramaGridDesktop } from '../components/CronogramaGridDesktop';
import { CronogramaListMobile } from '../components/CronogramaListMobile';
import { HorarioModalForm } from '../components/HorarioModalForm';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { PendingChangesDock } from '@/components/ui/pending-changes-dock';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
    toast.success('Filtros restablecidos');
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
        toast.success('Horario modificado en borrador. Presioná "Guardar cambios" para consolidar.');
      }
      return res;
    } else {
      const res = crearHorario(data);
      if (res.ok) {
        toast.success('Nuevo horario agregado al borrador. Presioná "Guardar cambios" para consolidar.');
      }
      return res;
    }
  };

  const handleConfirmDelete = async () => {
    if (!horarioAEliminar) return;
    const res = await eliminarHorario(horarioAEliminar.id);
    if (res.ok) {
      toast.success(res.advertencia ? `Horario dado de baja. ${res.advertencia}` : 'Horario dado de baja.');
      setIsModalOpen(false);
    } else {
      toast.error(res.error);
    }
    setHorarioAEliminar(null);
  };

  const handleGuardarCambios = async () => {
    const res = await guardarCambios();
    if (res.ok) {
      toast.success(`¡Cambios guardados! Se actualizaron ${res.guardados} clases.`);
    } else {
      toast.error(`${res.error} Los cambios que no se guardaron siguen en el borrador.`);
    }
  };

  const handleCancelarCambios = () => {
    cancelarCambios();
    toast.success('Cambios descartados: se restauró el cronograma oficial.');
  };

  const handleMoveHorario = (
    horarioId: string,
    nuevoDia: DiaSemana,
    nuevaHoraInicio: string,
    slotFin?: string
  ) => {
    const res = moverHorario(horarioId, nuevoDia, nuevaHoraInicio, slotFin);
    if (res.ok) {
      toast.success('Clase reubicada en borrador. Presioná "Guardar cambios" para consolidar.');
    } else {
      toast.error(res.error);
    }
  };

  const handleSwapHorarios = (idA: string, idB: string) => {
    const res = intercambiarHorarios(idA, idB);
    if (res.ok) {
      toast.success('Clases intercambiadas en borrador. Presioná "Guardar cambios" para consolidar.');
    } else {
      toast.error(res.error);
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
              <Button type="button" onClick={reintentarCarga} className="min-h-[44px] px-5">
                Reintentar
              </Button>
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
                <Badge variant="outline" className="rounded-full border-pink-100 bg-pink-50 px-3 py-1 text-sm font-bold text-[#E91E82] shadow-2xs">
                  {totalHorarios} clases asignadas
                </Badge>
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 [&_svg]:size-3.5"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Filtros</span>
              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="flex h-5 w-5 items-center justify-center rounded-full border-0 bg-[#E91E82] p-0 text-xs font-extrabold text-white">
                  {activeFiltersCount}
                </Badge>
              )}
              {isMobileFiltersOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              )}
            </Button>

            {isFilterActive && (
              <Button
                type="button"
                variant="link"
                onClick={resetFilters}
                className="h-auto min-h-[44px] px-0 text-sm font-bold text-[#E91E82]"
              >
                Limpiar filtros
              </Button>
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
            <Select value={filtroActividad} onValueChange={setFiltroActividad}>
              <SelectTrigger
                aria-label="Filtrar por disciplina"
                className="w-full min-h-[44px] rounded-xl border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las disciplinas ({actividades.length})</SelectItem>
                {actividades.map((act) => (
                  <SelectItem key={act.id} value={act.id}>
                    {act.nombre} ({act.modalidad === 'PERSONALIZADA' ? 'Pers.' : 'Grupal'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Profesora */}
            <Select value={filtroProfesora} onValueChange={setFiltroProfesora}>
              <SelectTrigger
                aria-label="Filtrar por profesora"
                className="w-full min-h-[44px] rounded-xl border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas las profesoras ({profesoras.length})</SelectItem>
                {profesoras.map((prof) => (
                  <SelectItem key={prof.id} value={prof.id}>
                    {prof.nombre} {prof.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Modalidad */}
            <Select value={filtroTipo} onValueChange={setFiltroTipo}>
              <SelectTrigger
                aria-label="Filtrar por modalidad"
                className="w-full min-h-[44px] rounded-xl border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 md:w-auto"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas las modalidades</SelectItem>
                <SelectItem value="grupal">Solo Grupales</SelectItem>
                <SelectItem value="personalizada">Solo Personalizadas</SelectItem>
              </SelectContent>
            </Select>

            {isFilterActive && (
              <Button
                type="button"
                variant="ghost"
                onClick={resetFilters}
                className="hidden min-h-[44px] items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold text-[#E91E82] hover:bg-pink-50 hover:text-[#BC1266] md:inline-flex [&_svg]:size-3.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Limpiar filtros
              </Button>
            )}

            {isFilterActive && (
              <Badge variant="outline" className="ml-auto hidden rounded-xl border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 md:inline-flex">
                Modo consulta activo
              </Badge>
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
              <Button
                type="button"
                onClick={() => handleOpenCreate('LUNES', '08:00')}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-[#E91E82] to-[#BC1266] px-5 py-2.5 text-sm font-bold text-white shadow-xs transition hover:from-[#BC1266] hover:to-[#900e4e] hover:shadow-md"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nuevo Horario</span>
              </Button>
            </div>

            {/* MENSAJE CUANDO EL CRONOGRAMA ESTÁ VACÍO */}
            {totalHorarios === 0 ? (
              <Card className="mb-5 rounded-2xl border-amber-200/90 bg-gradient-to-r from-amber-50/90 via-white to-pink-50/70 p-4 shadow-xs sm:p-5">
                <CardContent className="flex flex-col items-center justify-between gap-4 p-0 sm:flex-row">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <CalendarX className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-slate-900">
                          Cronograma vacío
                        </h3>
                        <Badge variant="outline" className="rounded-full border-0 bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                          Sin clases activas
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
                        Actualmente no hay ninguna clase programada. Asigná la primera clase semanal haciendo clic en <strong>"+ Nueva clase"</strong>.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handleOpenCreate('LUNES', '08:00')}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-xs [&_svg]:size-3.5"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Asignar primera clase</span>
                  </Button>
                </CardContent>
              </Card>
            ) : isFilterActive && horariosMostrados.length === 0 ? (
              <Alert className="mb-5 flex items-center justify-between gap-3 rounded-2xl border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <AlertDescription>
                  No se encontraron clases programadas con los filtros seleccionados.
                </AlertDescription>
                <Button
                  type="button"
                  variant="link"
                  onClick={resetFilters}
                  className="h-auto shrink-0 px-0 text-sm font-bold text-[#E91E82]"
                >
                  Restablecer filtros
                </Button>
              </Alert>
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

    </OwnerLayout>
  );
};
