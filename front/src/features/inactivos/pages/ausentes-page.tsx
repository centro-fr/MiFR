import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { AppleMailIcon } from "@/components/icons/apple-mail-icon";
import { ApplePhoneIcon } from "@/components/icons/apple-phone-icon";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { BotonLimpiarFiltros } from "@/components/ui/boton-limpiar-filtros";
import { cn } from "@/lib/utils";
import { mensajeDeErrorApi } from "@/api/errores";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import {
  useAlumnosInactivos,
  useQuitarSeguimiento,
  useRegistrarSeguimiento,
} from "@/features/inactivos/hooks/use-inactivos";
import type {
  AlumnoInactivo,
  FiltrosAlumnosInactivos,
} from "@/features/inactivos/schemas/inactivos";
import {
  formatearUltimaAsistencia,
  generarEnlaceWhatsApp,
  generarMensajeReintegro,
  obtenerContactoPrioritario,
} from "@/features/inactivos/utils/formato-inactivos";

type TabGestion = "PENDIENTE" | "CONTACTADO" | "IGNORADO" | "TODOS";

const PESTANAS: Array<{ id: TabGestion; etiqueta: string }> = [
  { id: "PENDIENTE", etiqueta: "Por contactar" },
  { id: "CONTACTADO", etiqueta: "Contactados" },
  { id: "IGNORADO", etiqueta: "Ignorados" },
  { id: "TODOS", etiqueta: "Todos" },
];

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/u)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}

function BadgeEstadoAusente({
  estado,
}: {
  estado: "PENDIENTE" | "CONTACTADO" | "GESTIONADO" | "IGNORADO";
}) {
  if (estado === "CONTACTADO" || estado === "GESTIONADO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/60 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 whitespace-nowrap shadow-2xs dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300">
        <span className="size-1.5 rounded-full shrink-0 bg-emerald-500" aria-hidden="true" />
        {estado === "GESTIONADO" ? "Gestionado" : "Contactado"}
      </span>
    );
  }
  if (estado === "IGNORADO") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 whitespace-nowrap shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
        <span className="size-1.5 rounded-full shrink-0 bg-slate-400" aria-hidden="true" />
        Ignorado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/60 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 whitespace-nowrap shadow-2xs dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300">
      <span className="size-1.5 rounded-full shrink-0 bg-amber-500" aria-hidden="true" />
      Contactar
    </span>
  );
}

export function AusentesPage() {
  const [tabActual, setTabActual] = useState<TabGestion>("PENDIENTE");
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [filtroPlan, setFiltroPlan] = useState<string>("TODOS");
  const [filtroInasistencias, setFiltroInasistencias] = useState<string>("DEFAULT");
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  const registrar = useRegistrarSeguimiento();
  const quitar = useQuitarSeguimiento();

  useEffect(() => {
    const temporizador = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

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
  const consultaTodos = useAlumnosInactivos({ ...filtrosBase, incluir_ignorados: true });

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
    TODOS:
      consultaTodos.data?.total ??
      (consultaPendientes.data?.total ?? 0) +
        (consultaContactados.data?.total ?? 0) +
        (consultaIgnorados.data?.total ?? 0),
  };

  const alumnos = consultaInactivos.data?.datos ?? [];
  const umbral = consultaInactivos.data?.umbral ?? 3;

  const alumnosFiltrados = useMemo(() => {
    if (!busquedaDebounced) return alumnos;
    const termino = busquedaDebounced.toLowerCase().trim();
    return alumnos.filter((a) => {
      const nombreCompleto = `${a.alumno.nombre} ${a.alumno.apellido}`.toLowerCase();
      const tutor = a.tutor ? `${a.tutor.nombre} ${a.tutor.apellido}`.toLowerCase() : "";
      const tel = a.alumno.telefono ?? a.tutor?.telefono ?? "";
      return nombreCompleto.includes(termino) || tutor.includes(termino) || tel.includes(termino);
    });
  }, [alumnos, busquedaDebounced]);

  const hayFiltrosActivos =
    busquedaDebounced.trim() !== "" ||
    filtroProfesora !== "TODAS" ||
    filtroPlan !== "TODOS" ||
    filtroInasistencias !== "DEFAULT";

  function limpiarFiltros() {
    setBusqueda("");
    setBusquedaDebounced("");
    setFiltroProfesora("TODAS");
    setFiltroPlan("TODOS");
    setFiltroInasistencias("DEFAULT");
  }

  async function handleContactar(alumno: AlumnoInactivo) {
    await registrar.mutateAsync({
      idInscripcion: alumno.id_inscripcion,
      estado: "CONTACTADO",
    });
  }

  async function handleIgnorar(alumno: AlumnoInactivo) {
    await registrar.mutateAsync({
      idInscripcion: alumno.id_inscripcion,
      estado: "IGNORADO",
    });
  }

  async function handleRevertir(alumno: AlumnoInactivo) {
    await quitar.mutateAsync(alumno.id_inscripcion);
  }

  return (
    <OwnerLayout>
      <div className="space-y-4 sm:space-y-5 min-w-0">
        {/* Encabezado Principal */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Ausentes
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Busca los alumnos ausentes que queres contactar
            </p>
          </div>
        </header>

        {/* Barra de filtros integrada como en image.png */}
        <section aria-label="Filtros de alumnos ausentes" className="space-y-2.5">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[280px] max-w-sm">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              />
              <Input
                id="buscar-ausentes"
                aria-label="Buscar por nombre, apellido o DNI"
                value={busqueda}
                onChange={(evento) => setBusqueda(evento.target.value)}
                placeholder="Buscar por nombre, apellido o DNI"
                autoComplete="off"
                className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            {/* Botón de filtros para mobile */}
            <button
              type="button"
              aria-label="Filtros adicionales"
              onClick={() => setMostrarFiltrosMobile((v) => !v)}
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                (mostrarFiltrosMobile || hayFiltrosActivos) && "border-primary text-primary",
              )}
            >
              <SlidersHorizontal className="size-4" />
            </button>

            {/* Selects secundarios en píldoras (mismo alto h-10 y bordes rounded-lg que el buscador) */}
            <div className={cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !mostrarFiltrosMobile && "hidden xl:flex")}>
              {/* Select Plan */}
              <SelectorDesplegable
                id="filtro-plan"
                etiqueta="Plan"
                aria-label="Plan"
                valor={filtroPlan}
                opciones={[
                  { valor: "TODOS", texto: "Todos" },
                  ...(consultaPlanes.data ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre })),
                ]}
                onChange={setFiltroPlan}
                variante="pildora"
              />

              {/* Select Profesora */}
              <SelectorDesplegable
                id="filtro-profesora"
                etiqueta="Profesora"
                aria-label="Profesora"
                valor={filtroProfesora}
                opciones={[
                  { valor: "TODAS", texto: "Todas" },
                  ...(consultaProfesoras.data ?? []).map((p) => ({ valor: p.id, texto: `${p.nombre} ${p.apellido}` })),
                ]}
                onChange={setFiltroProfesora}
                variante="pildora"
              />

              {/* Select Faltas */}
              <SelectorDesplegable
                id="filtro-inasistencias"
                etiqueta="Faltas"
                aria-label="Faltas"
                valor={filtroInasistencias}
                opciones={[
                  { valor: "DEFAULT", texto: `${umbral} o más` },
                  { valor: "4", texto: "4 o más" },
                  { valor: "5", texto: "5 o más" },
                ]}
                onChange={setFiltroInasistencias}
                variante="pildora"
              />

              {/* Botón limpiar filtros */}
              {hayFiltrosActivos && (
                <BotonLimpiarFiltros onLimpiar={limpiarFiltros} />
              )}
            </div>
          </div>
        </section>

        {/* Pestañas de estado para mobile */}
        <div className="flex lg:hidden items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
          {PESTANAS.map((pestana) => {
            const activa = tabActual === pestana.id;
            const conteo = conteosPorTab[pestana.id];

            return (
              <button
                key={pestana.id}
                type="button"
                onClick={() => setTabActual(pestana.id)}
                className={cn(
                  "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                  activa
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                )}
              >
                <span>{pestana.etiqueta}</span>
                <span className={cn(activa ? "text-primary font-black" : "text-slate-500")}>
                  {conteo}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback de Carga / Error / Vacío */}
        {consultaInactivos.isPending ? (
          <TablaSkeleton ariaLabel="Cargando alumnos ausentes" cantidadPestanas={4} filas={5} />
        ) : consultaInactivos.isError ? (
          <EstadoErrorCarga
            mensaje={mensajeDeErrorApi(consultaInactivos.error, "No se pudo cargar el listado de alumnos ausentes.")}
            onReintentar={() => void consultaInactivos.refetch()}
          />
        ) : alumnosFiltrados.length === 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
            {/* Header de pestañas para desktop dentro de la tarjeta idéntico a image.png */}
            <div className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {PESTANAS.map((pestana) => {
                const activa = tabActual === pestana.id;
                const conteo = conteosPorTab[pestana.id];

                return (
                  <button
                    key={pestana.id}
                    type="button"
                    onClick={() => setTabActual(pestana.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                      activa
                        ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
                    )}
                  >
                    <span>{pestana.etiqueta}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-extrabold",
                        activa
                          ? "bg-primary text-white"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                      )}
                    >
                      {conteo}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
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
                <BotonLimpiarFiltros onLimpiar={limpiarFiltros} className="mt-2" />
              )}
            </div>
          </div>
        ) : (
          <>
            {/* VISTA MOBILE: Lista agrupada limpia y en tonos neutros igual que en Listado */}
            <div className="lg:hidden overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100 dark:border-slate-700/80 dark:bg-slate-800 dark:divide-slate-700/60">
              {alumnosFiltrados.map((alumno) => {
                const contacto = obtenerContactoPrioritario(alumno);
                const enlaceWa = generarEnlaceWhatsApp(contacto.telefono, generarMensajeReintegro(alumno));
                const inicialesAlumno = iniciales(`${alumno.alumno.nombre} ${alumno.alumno.apellido}`);
                const etiquetaEstadoMobile =
                  alumno.gestion.estado === "CONTACTADO"
                    ? "Contactado"
                    : alumno.gestion.estado === "IGNORADO"
                      ? "Ignorado"
                      : "Por contactar";

                return (
                  <div
                    key={alumno.id_inscripcion}
                    className="flex flex-wrap items-center justify-between gap-3 p-3.5 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-700/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-pink-700 dark:bg-pink-950/70 dark:text-pink-200">
                        {inicialesAlumno}
                      </span>
                      <div className="min-w-0">
                        <Link
                          to={`/app/alumnos/${alumno.alumno.id_alumno}`}
                          className="truncate block text-sm font-extrabold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                        >
                          {alumno.alumno.nombre} {alumno.alumno.apellido}
                        </Link>
                        {contacto.esTutor && (
                          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                            Tutor: {contacto.nombreCompleto}
                          </p>
                        )}
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          {alumno.inasistencias_consecutivas} faltas ·{" "}
                          {formatearUltimaAsistencia(alumno.fecha_ultima_asistencia)}
                          {tabActual === "TODOS" && ` · ${etiquetaEstadoMobile}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {/* Canales de Contacto Directos con Iconos Reales */}
                      <div className="flex items-center gap-1.5">
                        {enlaceWa ? (
                          <a
                            href={enlaceWa}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Abrir WhatsApp con mensaje a ${contacto.nombreCompleto}`}
                            title="Abrir WhatsApp"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <WhatsAppIcon className="size-6 shrink-0" />
                          </a>
                        ) : (
                          <span
                            title="Sin teléfono para WhatsApp"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                          >
                            <WhatsAppIcon className="size-6 shrink-0" />
                          </span>
                        )}

                        {contacto.email ? (
                          <a
                            href={`mailto:${contacto.email}`}
                            aria-label={`Enviar email a ${contacto.nombreCompleto}`}
                            title={`Enviar correo a ${contacto.email}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <AppleMailIcon className="size-6 shrink-0" />
                          </a>
                        ) : (
                          <span
                            title="Sin email registrado"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                          >
                            <AppleMailIcon className="size-6 shrink-0" />
                          </span>
                        )}

                        {contacto.telefono ? (
                          <a
                            href={`tel:${contacto.telefono}`}
                            aria-label={`Llamar a ${contacto.nombreCompleto}`}
                            title={`Llamar a ${contacto.telefono}`}
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                          >
                            <ApplePhoneIcon className="size-6 shrink-0" />
                          </a>
                        ) : (
                          <span
                            title="Sin teléfono registrado"
                            className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                          >
                            <ApplePhoneIcon className="size-6 shrink-0" />
                          </span>
                        )}
                      </div>

                      {/* Botones de acción directos sin modal */}
                      <div className="flex items-center gap-1.5">
                        {alumno.gestion.estado === "PENDIENTE" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleContactar(alumno)}
                              disabled={registrar.isPending}
                              className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                            >
                              Contactado
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleIgnorar(alumno)}
                              disabled={registrar.isPending}
                              className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Ignorar
                            </Button>
                          </>
                        )}
                        {alumno.gestion.estado === "CONTACTADO" && (
                          <>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => void handleRevertir(alumno)}
                              disabled={quitar.isPending}
                              className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                            >
                              Revertir
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => void handleIgnorar(alumno)}
                              disabled={registrar.isPending}
                              className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Ignorar
                            </Button>
                          </>
                        )}
                        {alumno.gestion.estado === "IGNORADO" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => void handleRevertir(alumno)}
                            disabled={quitar.isPending}
                            className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                          >
                            Revertir
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* VISTA DESKTOP: Tabla exactamente como en image.png */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs lg:block dark:border-slate-700/80 dark:bg-slate-900">
              {/* Header de pestañas dentro de la tarjeta idéntico a image.png */}
              <div className="flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                {PESTANAS.map((pestana) => {
                  const activa = tabActual === pestana.id;
                  const conteo = conteosPorTab[pestana.id];

                  return (
                    <button
                      key={pestana.id}
                      type="button"
                      onClick={() => setTabActual(pestana.id)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
                        activa
                          ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                          : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
                      )}
                    >
                      <span>{pestana.etiqueta}</span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-extrabold",
                          activa
                            ? "bg-primary text-white"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                        )}
                      >
                        {conteo}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Alumno
                      </th>
                      <th scope="col" className="px-4 py-3.5 text-center">
                        Faltas seguidas
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Última asistencia
                      </th>
                      {tabActual === "TODOS" && (
                        <th scope="col" className="px-4 py-3.5">
                          Estado
                        </th>
                      )}
                      <th scope="col" className="px-4 py-3.5">
                        Contacto
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Teléfono
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {alumnosFiltrados.map((alumno) => {
                      const contacto = obtenerContactoPrioritario(alumno);
                      const enlaceWa = generarEnlaceWhatsApp(contacto.telefono, generarMensajeReintegro(alumno));
                      const inicialesAlumno = iniciales(`${alumno.alumno.nombre} ${alumno.alumno.apellido}`);

                      return (
                        <tr
                          key={alumno.id_inscripcion}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        >
                          {/* Alumno: avatar circular + nombre con link a la ficha + tutor en gris */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                                {inicialesAlumno}
                              </span>
                              <div className="min-w-0">
                                <Link
                                  to={`/app/alumnos/${alumno.alumno.id_alumno}`}
                                  className="font-extrabold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                                >
                                  {alumno.alumno.nombre} {alumno.alumno.apellido}
                                </Link>
                                {contacto.esTutor && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Tutor: {contacto.nombreCompleto}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Faltas seguidas: número con color, sin bordes ni fondo */}
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={cn(
                                "font-black text-sm tabular-nums",
                                alumno.inasistencias_consecutivas >= 4
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-amber-600 dark:text-amber-400",
                              )}
                            >
                              {alumno.inasistencias_consecutivas}
                            </span>
                          </td>

                          {/* Última asistencia */}
                          <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-300 font-medium">
                            {formatearUltimaAsistencia(alumno.fecha_ultima_asistencia)}
                          </td>

                          {/* Estado: solo visible en pestaña Todos */}
                          {tabActual === "TODOS" && (
                            <td className="px-4 py-3.5">
                              <BadgeEstadoAusente estado={alumno.gestion.estado} />
                            </td>
                          )}

                          {/* Canales de Contacto: WhatsApp, Mail, Teléfono con Iconos Reales */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              {enlaceWa ? (
                                <a
                                  href={enlaceWa}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={`Abrir WhatsApp con mensaje a ${contacto.nombreCompleto}`}
                                  title="Abrir WhatsApp"
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                                >
                                  <WhatsAppIcon className="size-6 shrink-0" />
                                </a>
                              ) : (
                                <span
                                  title="Sin teléfono para WhatsApp"
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                                >
                                  <WhatsAppIcon className="size-6 shrink-0" />
                                </span>
                              )}

                              {contacto.email ? (
                                <a
                                  href={`mailto:${contacto.email}`}
                                  aria-label={`Enviar email a ${contacto.nombreCompleto}`}
                                  title={`Enviar correo a ${contacto.email}`}
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-sky-300 dark:border-slate-700 dark:bg-slate-800"
                                >
                                  <AppleMailIcon className="size-6 shrink-0" />
                                </a>
                              ) : (
                                <span
                                  title="Sin email registrado"
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                                >
                                  <AppleMailIcon className="size-6 shrink-0" />
                                </span>
                              )}

                              {contacto.telefono ? (
                                <a
                                  href={`tel:${contacto.telefono}`}
                                  aria-label={`Llamar a ${contacto.nombreCompleto}`}
                                  title={`Llamar a ${contacto.telefono}`}
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white shadow-2xs transition-transform hover:scale-105 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-800"
                                >
                                  <ApplePhoneIcon className="size-6 shrink-0" />
                                </a>
                              ) : (
                                <span
                                  title="Sin teléfono registrado"
                                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200/40 bg-slate-50 opacity-40 grayscale dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed"
                                >
                                  <ApplePhoneIcon className="size-6 shrink-0" />
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Teléfono: columna al último antes de los botones de acción */}
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {contacto.telefono || "Sin teléfono"}
                          </td>

                          {/* Botones de acción directos sin modal */}
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {alumno.gestion.estado === "PENDIENTE" && (
                                <>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => void handleContactar(alumno)}
                                    disabled={registrar.isPending}
                                    className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                                  >
                                    Contactado
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void handleIgnorar(alumno)}
                                    disabled={registrar.isPending}
                                    className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    Ignorar
                                  </Button>
                                </>
                              )}
                              {alumno.gestion.estado === "CONTACTADO" && (
                                <>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void handleRevertir(alumno)}
                                    disabled={quitar.isPending}
                                    className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    Revertir
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => void handleIgnorar(alumno)}
                                    disabled={registrar.isPending}
                                    className="h-8 min-h-0 rounded-lg px-2.5 text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                                  >
                                    Ignorar
                                  </Button>
                                </>
                              )}
                              {alumno.gestion.estado === "IGNORADO" && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => void handleRevertir(alumno)}
                                  disabled={quitar.isPending}
                                  className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                                >
                                  Revertir
                                </Button>
                              )}
                            </div>
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
      </div>
    </OwnerLayout>
  );
}

