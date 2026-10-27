import { useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CalendarX,
  Clock,
  Users,
  ChevronRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { OwnerLayout } from "@/components/layout/owner-layout";
import {
  useCronogramaProfesor,
  DIAS_SEMANA_CRONOGRAMA,
} from "@/features/horarios/hooks/use-cronograma-profesor";
import { ModalDetalleClaseProfesor } from "@/features/horarios/components/modal-detalle-clase-profesor";
import type { DiaSemana, Horario } from "@/types/horarios";
import { cn } from "@/lib/utils";
import { mensajeDeErrorApi } from "@/api/errores";

const DIAS_POR_INDICE: Record<number, DiaSemana> = {
  1: "LUNES",
  2: "MARTES",
  3: "MIERCOLES",
  4: "JUEVES",
  5: "VIERNES",
};

function calcularDiaInicial(): DiaSemana {
  const diaNum = new Date().getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  return DIAS_POR_INDICE[diaNum] ?? "LUNES";
}

function ContenidoMisClases({ idProfesora }: { idProfesora: string }) {
  const { horarios, horariosPorDia, cargando, error, reintentar } =
    useCronogramaProfesor(idProfesora);

  const [diaSeleccionado, setDiaSeleccionado] = useState<DiaSemana>(calcularDiaInicial);
  const [horarioSeleccionado, setHorarioSeleccionado] = useState<Horario | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  function abrirDetalle(horario: Horario) {
    setHorarioSeleccionado(horario);
    setModalAbierto(true);
  }

  return (
    <div className="space-y-6 min-w-0">
      {/* ENCABEZADO PRINCIPAL (Estándar crear-nueva-vista) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Mis Clases
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
            Tu cronograma semanal de actividades y horarios asignados.
          </p>
        </div>

        <Button
          asChild
          className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/25 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
        >
          <Link to="/app/hoy">
            <CalendarClock className="size-4 mr-2" />
            Tomar asistencia hoy
          </Link>
        </Button>
      </div>

      {/* ESTADO DE CARGA */}
      {cargando && (
        <div
          role="status"
          className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 text-center"
        >
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300">
            Cargando tu cronograma semanal…
          </p>
        </div>
      )}

      {/* ESTADO DE ERROR */}
      {!cargando && error && (
        <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-800 rounded-3xl">
          <AlertCircle className="size-8 text-rose-600 dark:text-rose-400" />
          <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {mensajeDeErrorApi(error, "No se pudo cargar tu cronograma semanal.")}
          </p>
          <Button
            type="button"
            onClick={() => void reintentar()}
            className="min-h-[40px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold"
          >
            Reintentar
          </Button>
        </Card>
      )}

      {/* ESTADO VACÍO */}
      {!cargando && !error && horarios.length === 0 && (
        <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/30">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20">
            <CalendarX className="size-7" />
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            No tenés clases asignadas en el cronograma
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md font-medium">
            Cuando la administración configure horarios para tus actividades, aparecerán acá organizadas
            por día y franja horaria.
          </p>
        </Card>
      )}

      {/* CRONOGRAMA SEMANAL (Cuando hay horarios) */}
      {!cargando && !error && horarios.length > 0 && (
        <div className="space-y-4">
          {/* VISTA MOBILE: Pestañas por día y lista de tarjetas */}
          <div className="block md:hidden space-y-4">
            {/* Selector de Días con Estándar Unificado de Pestañas */}
            <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none select-none">
              {DIAS_SEMANA_CRONOGRAMA.map((dia) => {
                const activo = diaSeleccionado === dia.id;
                const cant = horariosPorDia[dia.id]?.length || 0;
                return (
                  <button
                    key={dia.id}
                    type="button"
                    onClick={() => setDiaSeleccionado(dia.id)}
                    className={cn(
                      "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
                      activo
                        ? "border-primary text-slate-900 dark:text-white"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                    )}
                  >
                    <span>{dia.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                        activo
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                      )}
                    >
                      {cant}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Lista de clases del día seleccionado */}
            <div className="space-y-3">
              {horariosPorDia[diaSeleccionado].length === 0 ? (
                <div className="p-8 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
                    No tenés clases asignadas los{" "}
                    {DIAS_SEMANA_CRONOGRAMA.find((d) => d.id === diaSeleccionado)?.label.toLowerCase()}.
                  </p>
                </div>
              ) : (
                horariosPorDia[diaSeleccionado].map((horario) => (
                  <button
                    key={horario.id}
                    type="button"
                    onClick={() => abrirDetalle(horario)}
                    className="w-full text-left rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-4 sm:p-5 shadow-xs hover:border-primary/50 active:scale-[0.99] transition-all flex items-center justify-between gap-3 group min-h-[56px]"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-black text-primary">
                          <Clock className="size-3.5" />
                          {horario.horaInicio} - {horario.horaFin}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-bold",
                            horario.actividadTipo === "PERSONALIZADA"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
                          )}
                        >
                          {horario.actividadTipo === "PERSONALIZADA" ? "Personalizada" : "Grupal"}
                        </Badge>
                      </div>

                      <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                        {horario.actividadNombre}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          Cupo: {horario.cupoMaximo ? `${horario.cupoMaximo} máx` : "Sin límite"}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="size-5 text-slate-400 group-hover:text-primary transition-transform group-hover:translate-x-0.5 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>

          {/* VISTA DESKTOP: Grilla semanal de 5 columnas (Lunes a Viernes) */}
          <div className="hidden md:block">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {DIAS_SEMANA_CRONOGRAMA.map((dia) => {
                const clasesDelDia = horariosPorDia[dia.id] || [];
                return (
                  <div
                    key={dia.id}
                    className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 p-3 min-h-[300px]"
                  >
                    {/* Encabezado del Día */}
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {dia.label}
                      </span>
                      <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {clasesDelDia.length}
                      </span>
                    </div>

                    {/* Tarjetas de Clases */}
                    <div className="space-y-2 flex-1">
                      {clasesDelDia.length === 0 ? (
                        <div className="h-full flex items-center justify-center p-3 text-center">
                          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 italic">
                            Sin clases
                          </p>
                        </div>
                      ) : (
                        clasesDelDia.map((horario) => (
                          <button
                            key={horario.id}
                            type="button"
                            onClick={() => abrirDetalle(horario)}
                            className="w-full text-left rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xs hover:shadow-sm hover:border-primary/50 transition-all group"
                          >
                            <span className="inline-block text-[11px] font-extrabold text-primary">
                              {horario.horaInicio} - {horario.horaFin}
                            </span>
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
                              {horario.actividadNombre}
                            </p>
                            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                              <span className="capitalize">
                                {horario.actividadTipo === "PERSONALIZADA" ? "Pers." : "Grupal"}
                              </span>
                              <span>
                                {horario.cupoMaximo ? `${horario.cupoMaximo} cupos` : "Libre"}
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FLOTANTE DE DETALLE DE CLASE */}
      <ModalDetalleClaseProfesor
        horario={horarioSeleccionado}
        abierto={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />
    </div>
  );
}

export function MisClasesPage() {
  return (
    <OwnerLayout>
      <ConMiIdDeProfesora>
        {(idProfesora) => <ContenidoMisClases idProfesora={idProfesora} />}
      </ConMiIdDeProfesora>
    </OwnerLayout>
  );
}
