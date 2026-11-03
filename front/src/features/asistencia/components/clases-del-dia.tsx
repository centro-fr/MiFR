import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  Search,
  Users,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NavegadorFecha } from "@/features/asistencia/components/navegador-fecha";
import { EstadoClase } from "@/features/asistencia/components/fila-clase";
import { horaDesdeApi } from "@/features/horarios/utils/cronograma";
import type { ClaseDelDiaApi } from "@/features/asistencia/schemas/asistencia";
import {
  estadoVisible,
  fechaLarga,
  puedeTomarAsistencia,
} from "@/features/asistencia/utils/formato-clase";
import { fechaActualArgentina } from "@/utils/fecha";
import { normalizarParaBuscar } from "@/utils/texto";
import { cn } from "@/utils/cn";

interface Props {
  clases: ClaseDelDiaApi[];
  baseRuta: string;
  fecha: string;
  error: string | null;
  cargando: boolean;
  propietaria: boolean;
  /** Nombre de cada profesora por id: la propietaria ve quién dicta cada clase. */
  profesoras?: ReadonlyMap<number, string>;
  onFechaChange?: (fecha: string) => void;
  onReintentar: () => void;
}

type FiltroEstado = "TODAS" | "EN_CURSO" | "PROGRAMADAS" | "CERRADAS" | "CANCELADAS";

const OPCIONES_FILTRO: { id: FiltroEstado; etiqueta: string }[] = [
  { id: "TODAS", etiqueta: "Todas" },
  { id: "EN_CURSO", etiqueta: "En curso" },
  { id: "PROGRAMADAS", etiqueta: "Programadas" },
  { id: "CERRADAS", etiqueta: "Cerradas" },
];

function enlaceDeClase(baseRuta: string, fecha: string, propietaria: boolean, idClase: number): string {
  const query = propietaria ? `?fecha=${encodeURIComponent(fecha)}` : "";
  return `${baseRuta}/${idClase}${query}`;
}

function cupoMaximoDe(clase: ClaseDelDiaApi): number | null {
  return clase.horario.cupo_maximo ?? clase.horario.actividad.cupo_maximo;
}

function Ocupacion({ clase }: { clase: ClaseDelDiaApi }) {
  const cupo = cupoMaximoDe(clase);
  if (clase.inscriptos === 0) {
    return <span className="text-xs font-semibold text-muted-foreground">Sin inscriptos</span>;
  }
  const texto = `${clase.inscriptos} ${clase.inscriptos === 1 ? "inscripto" : "inscriptos"}`;
  if (cupo === null) {
    return <span className="text-xs font-bold text-foreground">{texto}</span>;
  }
  const porcentaje = Math.min(100, Math.round((clase.inscriptos / cupo) * 100));
  return (
    <div className="flex flex-col gap-1 min-w-[5.5rem]">
      <span className="text-xs font-extrabold text-foreground tabular-nums">
        {clase.inscriptos} / {cupo} alumnos
      </span>
      <div aria-hidden="true" className="h-1.5 w-full max-w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

export function ClasesDelDia({
  clases,
  baseRuta,
  fecha,
  error,
  cargando,
  propietaria,
  profesoras,
  onFechaChange,
  onReintentar,
}: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("TODAS");

  const esHoy = fecha === fechaActualArgentina();

  // Mapear cada clase con su estado, si puede marcarse asistencia en este instante y profesora
  const clasesConEstado = useMemo(() => {
    return clases.map((clase) => ({
      clase,
      estado: estadoVisible(clase, esHoy),
      puedeMarcar: puedeTomarAsistencia(clase, esHoy, propietaria),
      profesora: propietaria ? profesoras?.get(clase.id_prof_dictante) : undefined,
    }));
  }, [clases, esHoy, propietaria, profesoras]);

  // Métricas para el panel de KPIs
  const metricas = useMemo(() => {
    let enCurso = 0;
    let cerradas = 0;
    let programadas = 0;
    let inscriptos = 0;
    for (const item of clasesConEstado) {
      if (item.estado === "EN_CURSO") {
        enCurso += 1;
      } else if (item.estado === "CERRADA") {
        cerradas += 1;
      } else if (item.estado === "PROGRAMADA") {
        programadas += 1;
      }
      inscriptos += item.clase.inscriptos;
    }
    return {
      total: clases.length,
      enCurso,
      cerradas,
      programadas,
      inscriptos,
    };
  }, [clasesConEstado, clases.length]);

  // Filtrado por buscador y estado
  const clasesFiltradas = useMemo(() => {
    const textoBuscado = normalizarParaBuscar(busqueda);

    return clasesConEstado.filter(({ clase, estado, profesora }) => {
      // Filtro de estado
      if (filtroEstado === "EN_CURSO" && estado !== "EN_CURSO") {
        return false;
      }
      if (filtroEstado === "PROGRAMADAS" && estado !== "PROGRAMADA") {
        return false;
      }
      if (filtroEstado === "CERRADAS" && estado !== "CERRADA") {
        return false;
      }
      if (filtroEstado === "CANCELADAS" && estado !== "CANCELADA") {
        return false;
      }

      // Filtro por texto
      if (textoBuscado) {
        const actividad = normalizarParaBuscar(clase.horario.actividad.nombre);
        const horaInicio = horaDesdeApi(clase.horario.hora_inicio);
        const horaFin = horaDesdeApi(clase.horario.hora_fin);
        const nombreProf = profesora ? normalizarParaBuscar(profesora) : "";

        const coincide =
          actividad.includes(textoBuscado) ||
          horaInicio.includes(textoBuscado) ||
          horaFin.includes(textoBuscado) ||
          nombreProf.includes(textoBuscado);

        if (!coincide) return false;
      }

      return true;
    });
  }, [clasesConEstado, busqueda, filtroEstado]);

  const hayFiltros = busqueda.trim() !== "" || filtroEstado !== "TODAS";

  function limpiarFiltros() {
    setBusqueda("");
    setFiltroEstado("TODAS");
  }

  const tituloPagina = propietaria ? "Asistencia" : "Hoy";
  const descripcionPagina = propietaria
    ? `Control y registro de asistencia diaria para el ${fechaLarga(fecha)}.`
    : `Clases del día y toma de asistencia para hoy, ${fechaLarga(fecha)}.`;

  return (
    <div className="space-y-6 min-w-0">
      {/* ENCABEZADO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
              {tituloPagina}
            </h1>
            {!cargando && !error && (
              <Badge
                variant="outline"
                className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
              >
                {clases.length} {clases.length === 1 ? "clase" : "clases"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed first-letter:uppercase">
            {descripcionPagina}
          </p>
        </div>

        {propietaria && onFechaChange && (
          <NavegadorFecha fecha={fecha} hoy={fechaActualArgentina()} onChange={onFechaChange} />
        )}
      </div>

      {/* ESTADO DE ERROR */}
      {error && (
        <Card className="flex flex-col items-center gap-3 border-rose-200 bg-rose-50/50 p-6 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <p role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
            {error}
          </p>
          <Button
            type="button"
            onClick={onReintentar}
            className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-bold text-white hover:bg-primary-dark"
          >
            Reintentar
          </Button>
        </Card>
      )}

      {/* ESTADO DE CARGA */}
      {cargando && (
        <div
          role="status"
          className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
          Cargando clases…
        </div>
      )}

      {!cargando && !error && (
        <>
          {/* PANEL DE KPIS / RESUMEN (Solo en vista de propietaria; innecesario para la profesora en su día a día) */}
          {propietaria && (
            <section aria-label="Resumen de clases" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Clases del día
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-pink-50 text-primary dark:bg-pink-950/60 dark:text-pink-400">
                    <CalendarClock className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-dark dark:text-white">
                  {metricas.total}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Total en esta fecha
                </p>
              </Card>

              <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    En curso
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Clock className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-dark dark:text-white">
                  {metricas.enCurso}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Asistencia abierta en este horario
                </p>
              </Card>

              <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Asistencias cerradas
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
                    <CheckCircle2 className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-dark dark:text-white">
                  {metricas.cerradas}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clases finalizadas
                </p>
              </Card>

              <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Alumnos inscriptos
                  </span>
                  <span className="flex size-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                    <Users className="size-4" />
                  </span>
                </div>
                <p className="mt-2 text-2xl font-black text-dark dark:text-white">
                  {metricas.inscriptos}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {metricas.inscriptos === 1 ? "1 alumno esperado" : `${metricas.inscriptos} alumnos esperados`}
                </p>
              </Card>
            </section>
          )}

          {/* BARRA DE BÚSQUEDA Y FILTROS */}
          <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Campo de búsqueda */}
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="search"
                  placeholder={
                    propietaria
                      ? "Buscar por actividad, horario o profesor/a..."
                      : "Buscar por actividad u horario..."
                  }
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="h-10 w-full rounded-lg border-border bg-slate-50/50 pl-9 text-sm transition-colors focus:bg-white dark:bg-canvas dark:focus:bg-surface-low"
                />
              </div>

              {/* Chips de filtro */}
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtros de estado de clase">
                {OPCIONES_FILTRO.map((opcion) => {
                  const activo = filtroEstado === opcion.id;
                  return (
                    <Button
                      key={opcion.id}
                      type="button"
                      variant="outline"
                      onClick={() => setFiltroEstado(opcion.id)}
                      className={cn(
                        "h-9 rounded-lg px-3 text-xs font-bold transition-all",
                        activo
                          ? "border-primary bg-primary text-white hover:bg-primary-dark hover:text-white dark:border-primary dark:bg-primary dark:text-white"
                          : "border-border bg-transparent text-slate-700 hover:bg-slate-100 hover:text-dark dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
                      )}
                    >
                      {opcion.etiqueta}
                    </Button>
                  );
                })}

                {hayFiltros && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={limpiarFiltros}
                    className="h-9 px-2.5 text-xs font-bold text-muted-foreground hover:text-dark dark:hover:text-white"
                  >
                    <X className="mr-1 size-3.5" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* LISTADO DE CLASES O ESTADO VACÍO */}
          {clases.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
              <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
                <CalendarClock aria-hidden="true" className="size-7" />
              </span>
              <h2 className="text-lg font-extrabold text-dark dark:text-white">
                No hay clases para esta fecha
              </h2>
              <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
                {propietaria
                  ? "No se encontraron clases programadas en la fecha seleccionada."
                  : "Cuando tengas una clase asignada para hoy, va a aparecer acá."}
              </p>
            </Card>
          ) : clasesFiltradas.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-700">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                <Search aria-hidden="true" className="size-6" />
              </span>
              <h3 className="text-base font-bold text-foreground">No se encontraron clases</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                No hay clases que coincidan con la búsqueda o el filtro seleccionado.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={limpiarFiltros}
                className="mt-1 h-9 rounded-lg text-xs font-bold"
              >
                Limpiar filtros
              </Button>
            </Card>
          ) : (
            <>
              {/* VISTA MOBILE (xl:hidden) - TARJETAS */}
              <div className="grid grid-cols-1 gap-3 xl:hidden">
                {clasesFiltradas.map(({ clase, estado, puedeMarcar, profesora }) => {
                  return (
                    <Card
                      key={clase.id_clase}
                      className={cn(
                        "rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low space-y-3",
                        estado === "EN_CURSO" && "border-pink-200 bg-pink-50/30 dark:border-primary/30 dark:bg-primary/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="inline-block text-xs font-extrabold uppercase tracking-wider text-primary">
                            {horaDesdeApi(clase.horario.hora_inicio)} a {horaDesdeApi(clase.horario.hora_fin)}
                          </span>
                          <h3 className="text-base font-extrabold text-dark dark:text-white truncate">
                            {clase.horario.actividad.nombre}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs font-semibold",
                                clase.horario.actividad.modalidad === "GRUPAL"
                                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                                  : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                              )}
                            >
                              {clase.horario.actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada"}
                            </Badge>
                            {profesora && <span className="truncate">· {profesora}</span>}
                          </div>
                        </div>
                        <EstadoClase estado={estado} />
                      </div>

                      <div className="flex items-center justify-between border-t border-border pt-3 gap-2">
                        <Ocupacion clase={clase} />
                        <Button
                          asChild
                          size="sm"
                          className={cn(
                            "min-h-[44px] rounded-lg px-4 text-xs font-bold transition-all",
                            puedeMarcar
                              ? "bg-primary text-white hover:bg-primary-dark shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                          )}
                        >
                          <Link to={enlaceDeClase(baseRuta, fecha, propietaria, clase.id_clase)}>
                            {puedeMarcar ? "Tomar asistencia" : "Ver asistencia"}
                            <ChevronRight aria-hidden="true" className="ml-1 size-4" />
                          </Link>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {/* VISTA DESKTOP (hidden xl:block) - TABLA */}
              <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">
                <table className="w-full table-fixed text-left text-sm">
                  <caption className="sr-only">Listado de clases del {fechaLarga(fecha)}</caption>
                  <thead className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">
                    <tr>
                      <th scope="col" className="w-[18%] px-5 py-4">Horario</th>
                      <th scope="col" className="w-[28%] px-5 py-4">Actividad</th>
                      {propietaria && <th scope="col" className="w-[18%] px-5 py-4">Profesor/a</th>}
                      <th scope="col" className={propietaria ? "w-[16%] px-5 py-4" : "w-[22%] px-5 py-4"}>Inscriptos</th>
                      <th scope="col" className={propietaria ? "w-[12%] px-5 py-4" : "w-[14%] px-5 py-4"}>Estado</th>
                      <th scope="col" className="w-[18%] px-5 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {clasesFiltradas.map(({ clase, estado, puedeMarcar, profesora }) => {
                      return (
                        <tr
                          key={clase.id_clase}
                          className={cn(
                            "transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5",
                            estado === "EN_CURSO" && "bg-pink-50/30 dark:bg-primary/5"
                          )}
                        >
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-foreground tabular-nums text-base">
                              {horaDesdeApi(clase.horario.hora_inicio)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums ml-1.5">
                              a {horaDesdeApi(clase.horario.hora_fin)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-foreground">
                              {clase.horario.actividad.nombre}
                            </div>
                            <Badge
                              variant="outline"
                              className={cn(
                                "mt-1 text-xs font-semibold",
                                clase.horario.actividad.modalidad === "GRUPAL"
                                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300"
                                  : "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300"
                              )}
                            >
                              {clase.horario.actividad.modalidad === "GRUPAL" ? "Grupal" : "Personalizada"}
                            </Badge>
                          </td>
                          {propietaria && (
                            <td className="px-5 py-4 text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                              {profesora ?? "Sin asignar"}
                            </td>
                          )}
                          <td className="px-5 py-4">
                            <Ocupacion clase={clase} />
                          </td>
                          <td className="px-5 py-4">
                            <EstadoClase estado={estado} />
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              asChild
                              size="sm"
                              variant={puedeMarcar ? "default" : "outline"}
                              className={cn(
                                "min-h-[38px] rounded-xl px-4 text-xs font-bold transition-all",
                                puedeMarcar
                                  ? "bg-primary text-white shadow-sm hover:bg-primary-dark"
                                  : "border-border bg-white text-slate-700 hover:bg-slate-100 dark:bg-surface-low dark:text-slate-300 dark:hover:bg-white/10"
                              )}
                            >
                              <Link to={enlaceDeClase(baseRuta, fecha, propietaria, clase.id_clase)}>
                                {puedeMarcar ? "Tomar asistencia" : "Ver asistencia"}
                                <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
