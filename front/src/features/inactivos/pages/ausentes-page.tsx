import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  Loader2,
  UserCheck,
} from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { mensajeDeErrorApi } from "@/api/errores";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import { useAlumnosInactivos } from "@/features/inactivos/hooks/use-inactivos";
import type {
  AlumnoInactivo,
  EstadoGestionInactividad,
  FiltrosAlumnosInactivos,
} from "@/features/inactivos/schemas/inactivos";
import {
  formatearUltimaAsistencia,
  obtenerContactoPrioritario,
} from "@/features/inactivos/utils/formato-inactivos";
import { ModalGestionInactividad } from "@/features/inactivos/components/modal-gestion-inactividad";

type TabGestion = "PENDIENTE" | "CONTACTADO" | "IGNORADO" | "TODOS";

const PESTANAS: Array<{ id: TabGestion; etiqueta: string }> = [
  { id: "PENDIENTE", etiqueta: "Por contactar" },
  { id: "CONTACTADO", etiqueta: "Contactados" },
  { id: "IGNORADO", etiqueta: "Ignorados" },
  { id: "TODOS", etiqueta: "Todos" },
];

function badgeGestion(estado: EstadoGestionInactividad) {
  switch (estado) {
    case "PENDIENTE":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-xs"
        >
          Por contactar
        </Badge>
      );
    case "CONTACTADO":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-300 font-bold text-xs"
        >
          Contactado
        </Badge>
      );
    case "GESTIONADO":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-xs"
        >
          Gestionado
        </Badge>
      );
    case "IGNORADO":
      return (
        <Badge
          variant="outline"
          className="shrink-0 border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs"
        >
          Ignorado
        </Badge>
      );
  }
}

export function AusentesPage() {
  const [tabActual, setTabActual] = useState<TabGestion>("PENDIENTE");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [filtroPlan, setFiltroPlan] = useState<string>("TODOS");
  const [filtroInasistencias, setFiltroInasistencias] = useState<string>("DEFAULT");

  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<AlumnoInactivo | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  // Consultas secundarias para opciones de filtros
  const consultaProfesoras = useQuery({
    queryKey: PROFESORAS_QUERY_KEY,
    queryFn: listarProfesoras,
    staleTime: 5 * 60_000,
  });
  const consultaPlanes = usePlanes();

  // Filtros base aplicados a los conteos de todas las pestañas
  const filtrosBase = useMemo(() => {
    const f: Omit<FiltrosAlumnosInactivos, "estado_gestion"> = {};

    if (filtroProfesora !== "TODAS") {
      f.id_profesora = Number(filtroProfesora);
    }

    if (filtroPlan !== "TODOS") {
      f.id_plan = Number(filtroPlan);
    }

    if (filtroInasistencias === "4") {
      f.minimo_inasistencias = 4;
    } else if (filtroInasistencias === "5") {
      f.minimo_inasistencias = 5;
    }

    return f;
  }, [filtroProfesora, filtroPlan, filtroInasistencias]);

  const consultaPendientes = useAlumnosInactivos({ ...filtrosBase, estado_gestion: "PENDIENTE" });
  const consultaContactados = useAlumnosInactivos({ ...filtrosBase, estado_gestion: "CONTACTADO" });
  const consultaIgnorados = useAlumnosInactivos({ ...filtrosBase, estado_gestion: "IGNORADO" });
  const consultaTodos = useAlumnosInactivos(filtrosBase);

  const consultaInactivos = useMemo(() => {
    switch (tabActual) {
      case "PENDIENTE":
        return consultaPendientes;
      case "CONTACTADO":
        return consultaContactados;
      case "IGNORADO":
        return consultaIgnorados;
      case "TODOS":
        return consultaTodos;
    }
  }, [tabActual, consultaPendientes, consultaContactados, consultaIgnorados, consultaTodos]);

  const conteosPorTab: Record<TabGestion, number> = {
    PENDIENTE: consultaPendientes.data?.total ?? 0,
    CONTACTADO: consultaContactados.data?.total ?? 0,
    IGNORADO: consultaIgnorados.data?.total ?? 0,
    TODOS: consultaTodos.data?.total ?? 0,
  };

  const alumnos = consultaInactivos.data?.datos ?? [];
  const umbral = consultaInactivos.data?.umbral ?? 3;

  const hayFiltrosActivos =
    filtroProfesora !== "TODAS" || filtroPlan !== "TODOS" || filtroInasistencias !== "DEFAULT";

  function limpiarFiltros() {
    setFiltroProfesora("TODAS");
    setFiltroPlan("TODOS");
    setFiltroInasistencias("DEFAULT");
  }

  function abrirGestion(alumno: AlumnoInactivo) {
    setAlumnoSeleccionado(alumno);
    setModalAbierto(true);
  }

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* Encabezado Principal */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ausentes
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Detección proactiva de alumnos con cuota al día y faltas reiteradas para contactar e incentivar su reintegro.
            </p>
          </div>
        </div>

        {/* Pestañas de estado (Tabs) */}
        <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pt-1 scrollbar-none">
          {PESTANAS.map((pestana) => {
            const activa = tabActual === pestana.id;
            const conteo = conteosPorTab[pestana.id];

            return (
              <button
                key={pestana.id}
                type="button"
                onClick={() => setTabActual(pestana.id)}
                className={cn(
                  "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
                  activa
                    ? "border-primary text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                )}
              >
                <span>{pestana.etiqueta}</span>
                <span
                  className={cn(
                    "rounded-full text-xs px-2 py-0.5 font-black transition-colors",
                    activa
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                  )}
                >
                  {conteo}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtros Compactos en Píldoras */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          {/* Selector de Profesora */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Profesora:
            </span>
            <Select value={filtroProfesora} onValueChange={setFiltroProfesora}>
              <SelectTrigger
                aria-label="Filtrar por profesora"
                className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[90px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas</SelectItem>
                {(consultaProfesoras.data ?? []).map((profesora) => (
                  <SelectItem key={profesora.id} value={profesora.id}>
                    {profesora.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Plan */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Plan:
            </span>
            <Select value={filtroPlan} onValueChange={setFiltroPlan}>
              <SelectTrigger
                aria-label="Filtrar por plan"
                className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[80px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODOS">Todos</SelectItem>
                {(consultaPlanes.data ?? []).map((plan) => (
                  <SelectItem key={plan.id} value={String(plan.id)}>
                    {plan.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mínimo de inasistencias */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-1.5 shadow-2xs">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Faltas:
            </span>
            <Select value={filtroInasistencias} onValueChange={setFiltroInasistencias}>
              <SelectTrigger
                aria-label="Filtrar por mínimo de inasistencias"
                className="border-0 bg-transparent p-0 h-auto font-bold text-slate-900 dark:text-slate-100 shadow-none focus:ring-0 gap-1.5 text-xs sm:text-sm min-w-[70px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DEFAULT">{umbral} o más (umbral)</SelectItem>
                <SelectItem value="4">4 o más</SelectItem>
                <SelectItem value="5">5 o más</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botón limpiar filtros */}
          {hayFiltrosActivos && (
            <Button
              type="button"
              variant="ghost"
              onClick={limpiarFiltros}
              className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
            >
              Limpiar filtros
            </Button>
          )}
        </div>

        {/* Feedback de Carga / Error / Vacío */}
        {consultaInactivos.isPending ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            Cargando alumnos ausentes...
          </div>
        ) : consultaInactivos.isError ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-12 text-center rounded-3xl">
            <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(consultaInactivos.error, "No se pudo cargar el listado de alumnos ausentes.")}
            </p>
            <Button
              type="button"
              onClick={() => void consultaInactivos.refetch()}
              className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold"
            >
              Reintentar
            </Button>
          </Card>
        ) : alumnos.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl">
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300"
            >
              <UserCheck className="size-7" />
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {hayFiltrosActivos
                ? "No se encontraron alumnos con los filtros seleccionados"
                : tabActual === "PENDIENTE"
                  ? "¡Excelente! No hay ausencias pendientes de contactar"
                  : "No hay alumnos en esta sección"}
            </h2>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              {hayFiltrosActivos
                ? "Probá limpiando los filtros para ver otros alumnos ausentes."
                : tabActual === "PENDIENTE"
                  ? "Todos los alumnos con inasistencias consecutivas y cuota al día ya han sido contactados o gestionados."
                  : "Cuando registres acciones de seguimiento, se agruparán en esta pestaña."}
            </p>
            {hayFiltrosActivos && (
              <Button
                type="button"
                variant="outline"
                onClick={limpiarFiltros}
                className="mt-2 rounded-xl font-bold text-xs"
              >
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <>
            {/* VISTA MOBILE: Tarjetas encuadradas (mismo patrón responsive de Cuotas) */}
            <div className="grid grid-cols-1 gap-3.5 xl:hidden">
              {alumnos.map((alumno) => {
                const contacto = obtenerContactoPrioritario(alumno);

                return (
                  <div
                    key={alumno.id_inscripcion}
                    className="w-full min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-extrabold text-slate-900 dark:text-white truncate">
                          {alumno.alumno.nombre} {alumno.alumno.apellido}
                        </p>
                        {contacto.esTutor && (
                          <p className="text-xs font-semibold text-pink-600 dark:text-pink-400 truncate">
                            Tutor: {contacto.nombreCompleto}
                          </p>
                        )}
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {alumno.plan.nombre} • Prof. {alumno.profesora.nombre} {alumno.profesora.apellido}
                        </p>
                      </div>

                      {badgeGestion(alumno.gestion.estado)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-bold text-xs rounded-full px-2.5 py-0.5",
                          alumno.inasistencias_consecutivas >= 4
                            ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                            : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
                        )}
                      >
                        <AlertTriangle className="mr-1 size-3" />
                        {alumno.inasistencias_consecutivas} faltas consecutivas
                      </Badge>

                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Última: {formatearUltimaAsistencia(alumno.fecha_ultima_asistencia)}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => abrirGestion(alumno)}
                        className="w-full rounded-xl h-10 px-4 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                      >
                        Gestionar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP: Tabla limpia con hover y acciones claras */}
            <div className="hidden xl:block overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Alumno / Contacto
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Plan y Profesora
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-center">
                        Faltas seguidas
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Última asistencia
                      </th>
                      <th scope="col" className="px-6 py-3.5">
                        Estado
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                    {alumnos.map((alumno) => {
                      const contacto = obtenerContactoPrioritario(alumno);

                      return (
                        <tr
                          key={alumno.id_inscripcion}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          {/* Alumno */}
                          <td className="px-6 py-4">
                            <div className="min-w-0">
                              <p className="font-extrabold text-slate-900 dark:text-white">
                                {alumno.alumno.nombre} {alumno.alumno.apellido}
                              </p>
                              {contacto.esTutor && (
                                <p className="text-xs font-semibold text-pink-600 dark:text-pink-400">
                                  Tutor: {contacto.nombreCompleto}
                                </p>
                              )}
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Tel: {contacto.telefono || "Sin teléfono"}
                              </p>
                            </div>
                          </td>

                          {/* Plan y Profesora */}
                          <td className="px-6 py-4">
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white">
                                {alumno.plan.nombre}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                Prof. {alumno.profesora.nombre} {alumno.profesora.apellido}
                              </p>
                            </div>
                          </td>

                          {/* Faltas consecutivas */}
                          <td className="px-6 py-4 text-center">
                            <Badge
                              variant="outline"
                              className={cn(
                                "font-bold text-xs rounded-full px-2.5 py-0.5",
                                alumno.inasistencias_consecutivas >= 4
                                  ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300",
                              )}
                            >
                              <AlertTriangle className="mr-1 size-3" />
                              {alumno.inasistencias_consecutivas}
                            </Badge>
                          </td>

                          {/* Última asistencia */}
                          <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {formatearUltimaAsistencia(alumno.fecha_ultima_asistencia)}
                          </td>

                          {/* Estado */}
                          <td className="px-6 py-4">
                            {badgeGestion(alumno.gestion.estado)}
                          </td>

                          {/* Acciones */}
                          <td className="px-6 py-4 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => abrirGestion(alumno)}
                              className="h-8 rounded-xl px-4 text-xs font-bold border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Gestionar
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Modal Centrado de Gestión de Inactividad */}
        <ModalGestionInactividad
          alumno={alumnoSeleccionado}
          abierto={modalAbierto}
          onClose={() => {
            setModalAbierto(false);
            setAlumnoSeleccionado(null);
          }}
        />
      </div>
    </OwnerLayout>
  );
}
