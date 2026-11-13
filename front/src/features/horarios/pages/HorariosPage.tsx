import React, { useEffect, useState } from 'react';
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
import { TablaSkeleton, EstadoErrorCarga } from '@/components/ui/estados-pantalla';
import { SelectorDesplegable } from '@/components/formulario/selector-desplegable';
import { BotonLimpiarFiltros } from '@/components/ui/boton-limpiar-filtros';
import { BotonFiltrosMovil } from '@/components/ui/boton-filtros-movil';
import { clasePanelFiltros } from '@/components/ui/estilos-lista';
import type { DiaSemana, Horario, HorarioFormData } from '../../../types/horarios';
import { Plus } from 'lucide-react';

export const HorariosPage: React.FC = () => {
  const {
    cargando,
    errorCarga,
    reintentarCarga,
    horarios,
    todosLosHorarios,
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
    cancelarBajaProgramada,
    moverHorario,
    intercambiarHorarios,
    validarSuperposicion,
    hayCambiosPendientes,
    cantidadCambiosPendientes,
    guardando,
    guardarCambios,
    cancelarCambios,
  } = useHorarios();

  const [selectedMobileDay, setSelectedMobileDay] = useState<DiaSemana>('LUNES');
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);

  // Protección para no perder cambios en borrador si se recarga o cierra la ventana
  useEffect(() => {
    if (!hayCambiosPendientes) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hayCambiosPendientes]);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [horarioEnEdicion, setHorarioEnEdicion] = useState<Horario | null>(null);
  const [diaSugerido, setDiaSugerido] = useState<DiaSemana>('LUNES');
  const [horaSugerida, setHoraSugerida] = useState<string>('08:00');
  const [horarioAEliminar, setHorarioAEliminar] = useState<Horario | null>(null);

  // Saber si hay filtros activos
  const isFilterActive =
    filtroActividad !== 'TODAS' || filtroProfesora !== 'TODAS';

  // Filtrado reactivo de horarios
  const horariosMostrados = horarios;

  const resetFilters = () => {
    setFiltroActividad('TODAS');
    setFiltroProfesora('TODAS');
    toast.success('Filtros restablecidos');
  };

  // Acciones de modal
  const handleOpenCreate = (dia: DiaSemana = 'LUNES', horaInicio: string = '08:00') => {
    if (isFilterActive) {
      setFiltroActividad('TODAS');
      setFiltroProfesora('TODAS');
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
    if (horarioAEliminar.bajaProgramada) {
      const cancelada = await cancelarBajaProgramada(horarioAEliminar.id);
      if (cancelada.ok) {
        toast.success('Se canceló la baja programada: el horario vuelve a admitir alumnos.');
        setIsModalOpen(false);
      } else {
        toast.error(cancelada.error);
      }
      setHorarioAEliminar(null);
      return;
    }
    const res = await eliminarHorario(horarioAEliminar.id);
    if (res.ok) {
      const titulo = res.programada ? 'Baja programada.' : 'Horario dado de baja.';
      toast.success(res.advertencia && res.programada ? `${titulo} ${res.advertencia}` : titulo);
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
        <div className="space-y-6 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                Horarios
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 font-medium leading-relaxed">
                La semana del centro: qué clase hay, con quién y cuántos lugares quedan.
              </p>
            </div>
          </div>
          {cargando ? (
            <TablaSkeleton ariaLabel="Cargando cronograma" cantidadPestanas={5} filas={6} />
          ) : (
            <EstadoErrorCarga
              mensaje={mensajeDeErrorApi(errorCarga, 'No se pudo cargar el cronograma.')}
              onReintentar={reintentarCarga}
            />
          )}
        </div>
      </OwnerLayout>
    );
  }

  return (
    <OwnerLayout>
      {/* CONTENIDO PRINCIPAL */}
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Horarios
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5 font-medium leading-relaxed">
              La semana del centro: qué clase hay, con quién y cuántos lugares quedan.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => handleOpenCreate('LUNES', '08:00')}
            className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
          >
            + Nuevo horario
          </Button>
        </div>

        {/* BARRA DE FILTROS RESPONSIVE: en el celular, detrás del botón "Filtros" */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <BotonFiltrosMovil
            abierto={filtrosAbiertos}
            activos={isFilterActive}
            onAlternar={() => setFiltrosAbiertos((v) => !v)}
            idPanel="filtros-horarios"
            conTexto
          />
          <div id="filtros-horarios" className={clasePanelFiltros(filtrosAbiertos)}>
            {/* Profesor/a */}
            <SelectorDesplegable
              id="filtro-profesora"
              etiqueta="Profesor/a"
              aria-label="Filtrar por profesor/a"
              valor={filtroProfesora}
              todos="Todos"
              opciones={profesoras.map((prof) => ({
                valor: prof.id,
                texto: `${prof.nombre} ${prof.apellido}`,
              }))}
              onChange={setFiltroProfesora}
              variante="pildora"
            />

            {/* Actividad */}
            <SelectorDesplegable
              id="filtro-actividad"
              etiqueta="Actividad"
              aria-label="Filtrar por disciplina"
              valor={filtroActividad}
              todos="Todas"
              opciones={actividades.map((act) => ({
                valor: act.id,
                texto: act.nombre,
              }))}
              onChange={setFiltroActividad}
              variante="pildora"
            />

            {isFilterActive && (
              <BotonLimpiarFiltros onLimpiar={resetFilters} />
            )}
          </div>
        </div>

        {/* ÁREA DE CONTENIDO / CRONOGRAMA */}
        <div className={`w-full py-2 overflow-y-auto flex-1 ${hayCambiosPendientes ? 'pb-28' : ''}`}>
          <div className="w-full">

            {/* MENSAJE CUANDO EL CRONOGRAMA ESTÁ VACÍO */}
            {totalHorarios === 0 ? (
              <Card className="mb-5 rounded-lg border-amber-200/90 dark:border-amber-500/30 bg-gradient-to-r from-amber-50/90 dark:from-amber-500/10 via-white dark:via-card to-pink-50/70 dark:to-primary/10 p-4 shadow-xs sm:p-5">
                <CardContent className="flex flex-col items-start justify-between gap-4 p-0 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-extrabold text-foreground">
                        Cronograma vacío
                      </h3>
                      <Badge variant="outline" className="rounded-full border-0 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-sm font-bold text-amber-800 dark:text-amber-200">
                        Sin clases activas
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                      Actualmente no hay ninguna clase programada. Asigná la primera clase semanal haciendo clic en <strong>"+ Nueva clase"</strong>.
                    </p>
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
              <Alert className="mb-5 flex items-center justify-between gap-3 rounded-lg border-border bg-slate-50 dark:bg-white/5 p-4 text-sm text-slate-600 dark:text-slate-300">
                <AlertDescription>
                  No se encontraron clases programadas con los filtros seleccionados.
                </AlertDescription>
                <Button
                  type="button"
                  variant="link"
                  onClick={resetFilters}
                  className="h-auto shrink-0 px-0 text-sm font-bold text-primary"
                >
                  Restablecer filtros
                </Button>
              </Alert>
            ) : null}

            {/* VISTA DESKTOP (GRILLA SEMANAL CON DRAG & DROP) */}
            <div className="hidden xl:block">
              <CronogramaGridDesktop
                horarios={horariosMostrados}
                todosLosHorarios={todosLosHorarios}
                onEdit={handleEdit}
                onDelete={(h) => setHorarioAEliminar(h)}
                onAddForCell={(dia, inicio) => handleOpenCreate(dia, inicio)}
                onMoveHorario={handleMoveHorario}
                onSwapHorarios={handleSwapHorarios}
                isFilterActive={isFilterActive}
              />
            </div>

            {/* VISTA MOBILE (LISTA TOUCH DIARIA, SIN ARRASTRE) */}
            <div className="block xl:hidden bg-transparent border-none shadow-none">
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
        </div>
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
