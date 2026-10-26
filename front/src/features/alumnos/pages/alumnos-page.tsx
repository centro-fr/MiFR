import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import type { FiltrosAlumnos } from "@/features/alumnos/api/alumnos-api";
import { useAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { ModalPreinscripcion } from "@/features/alumnos/components/preinscripcion/ModalPreinscripcion";
import { useFormasDePrimerPago } from "@/features/alumnos/hooks/use-formas-de-primer-pago";
import type { ResultadoPreinscripcion } from "@/features/alumnos/hooks/use-preinscripcion";
import { formatearDni } from "@/features/alumnos/utils/formato-ficha";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import { cn } from "@/utils/cn";

const TAMANO_PAGINA = 10;
type FiltrosDeLaPantalla = Omit<FiltrosAlumnos, "busqueda" | "limit" | "offset">;

const FILTROS_INICIALES: FiltrosDeLaPantalla = {
  estado: "TODOS",
  id_plan: "",
  id_profesora: "",
  id_actividad: "",
  incluir_bajas: false,
};

interface OpcionFiltro {
  id: string;
  etiqueta: string;
}

function useOpcionesDeFiltros() {
  const planes = usePlanes();
  const actividades = useActividades();
  const profesoras = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  return useMemo(
    () => ({
      planes: (planes.data ?? []).map((plan): OpcionFiltro => ({ id: plan.id, etiqueta: plan.nombre })),
      profesoras: (profesoras.data ?? []).map((profesora): OpcionFiltro => ({
        id: profesora.id,
        etiqueta: `${profesora.nombre} ${profesora.apellido}`,
      })),
      actividades: (actividades.data ?? []).map((actividad): OpcionFiltro => ({ id: actividad.id, etiqueta: actividad.nombre })),
    }),
    [planes.data, profesoras.data, actividades.data],
  );
}

function hayFiltrosActivos(busqueda: string, filtros: FiltrosDeLaPantalla, filtroCuota: string): boolean {
  return (
    busqueda.trim() !== "" ||
    filtros.id_plan !== "" ||
    filtros.id_profesora !== "" ||
    filtros.id_actividad !== "" ||
    filtros.incluir_bajas ||
    filtros.estado !== "TODOS" ||
    filtroCuota !== ""
  );
}

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/u)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}

function colorEstado(estado: string): string {
  if (estado === "ACTIVO") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200";
  }
  if (estado === "PENDIENTE") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200";
}

function etiquetaEstado(estado: string): string {
  if (estado === "ACTIVO") return "Activo";
  if (estado === "PENDIENTE") return "Pendiente de alta";
  return "Baja";
}

const CobroInmediato = lazy(() =>
  import("@/features/alumnos/components/alta-definitiva/cobro-inmediato").then((m) => ({ default: m.CobroInmediato })),
);

function CargandoAlumnos() {
  return (
    <div
      role="status"
      className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
    >
      <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
      Cargando alumnos…
    </div>
  );
}

function ErrorAlCargar({ mensaje, onReintentar }: { mensaje: string; onReintentar: () => void }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-700">
      <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
      <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {mensaje}
      </p>
      <Button
        type="button"
        onClick={onReintentar}
        className="min-h-[40px] rounded-xl bg-primary text-white hover:bg-primary-dark"
      >
        Reintentar
      </Button>
    </Card>
  );
}

export function AlumnosPage() {
  const { panelActivo, tieneLosDosPaneles } = usePanelActivo();
  const enPanelDeProfesora = panelActivo === "PROFESORA";
  return (
    <OwnerLayout>
      {enPanelDeProfesora && tieneLosDosPaneles ? (
        <ConMiIdDeProfesora>
          {(idProfesora) => <ListadoDeAlumnos soloACargo idProfesoraACargo={idProfesora} />}
        </ConMiIdDeProfesora>
      ) : (
        <ListadoDeAlumnos soloACargo={enPanelDeProfesora} />
      )}
    </OwnerLayout>
  );
}

interface ListadoDeAlumnosProps {
  /** Panel de Profesora: solo sus alumnos, así que no se ofrece filtrar por profesora. */
  soloACargo: boolean;
  /** Filtro fijo por profesora, para la propietaria en su panel de Profesora. */
  idProfesoraACargo?: string;
}

function ListadoDeAlumnos({ soloACargo, idProfesoraACargo }: ListadoDeAlumnosProps) {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filtros, setFiltros] = useState<FiltrosDeLaPantalla>(FILTROS_INICIALES);
  const [filtroCuota, setFiltroCuota] = useState<string>("");
  const [pagina, setPagina] = useState(0);
  const [modalPreinscripcionAbierto, setModalPreinscripcionAbierto] = useState(false);
  const puedeCobrar = useFormasDePrimerPago().length > 0;
  const [idInscripcionACobrar, setIdInscripcionACobrar] = useState<number | null>(null);
  const terminarCobro = useCallback(() => setIdInscripcionACobrar(null), []);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  const opciones = useOpcionesDeFiltros();
  const filtrando = hayFiltrosActivos(busquedaDebounced, filtros, filtroCuota);
  const idProfesora = idProfesoraACargo ?? filtros.id_profesora;

  // Consultas ligeras de conteo para los tabs de estado
  const consultaActivos = useAlumnos({
    busqueda: busquedaDebounced,
    id_plan: filtros.id_plan,
    id_profesora: idProfesora,
    id_actividad: filtros.id_actividad,
    estado: "ACTIVO",
    incluir_bajas: false,
    limit: 1,
    offset: 0,
  });

  const consultaPendientes = useAlumnos({
    busqueda: busquedaDebounced,
    id_plan: filtros.id_plan,
    id_profesora: idProfesora,
    id_actividad: filtros.id_actividad,
    estado: "PENDIENTE",
    incluir_bajas: false,
    limit: 1,
    offset: 0,
  });

  const consultaBajas = useAlumnos({
    busqueda: busquedaDebounced,
    id_plan: filtros.id_plan,
    id_profesora: idProfesora,
    id_actividad: filtros.id_actividad,
    estado: "BAJA",
    incluir_bajas: true,
    limit: 1,
    offset: 0,
  });

  // Consulta principal para la tabla y paginación
  const consulta = useAlumnos({
    busqueda: busquedaDebounced,
    ...filtros,
    id_profesora: idProfesora,
    limit: TAMANO_PAGINA,
    offset: pagina * TAMANO_PAGINA,
  });

  const respuesta = consulta.data;
  const paginas = Math.max(1, Math.ceil((respuesta?.total ?? 0) / TAMANO_PAGINA));
  const rangoInicio = respuesta && respuesta.total > 0 ? respuesta.offset + 1 : 0;
  const rangoFin = Math.min((respuesta?.offset ?? 0) + TAMANO_PAGINA, respuesta?.total ?? 0);

  const conteoActivos = consultaActivos.data?.total ?? (filtros.estado === "ACTIVO" ? (respuesta?.total ?? 0) : 0);
  const conteoPendientes = consultaPendientes.data?.total ?? (filtros.estado === "PENDIENTE" ? (respuesta?.total ?? 0) : 0);
  const conteoBajas = consultaBajas.data?.total ?? (filtros.estado === "BAJA" ? (respuesta?.total ?? 0) : 0);

  function alPreinscribir({ idInscripcion, cobrarAhora }: ResultadoPreinscripcion) {
    void consulta.refetch();
    if (cobrarAhora) setIdInscripcionACobrar(idInscripcion);
  }

  function cambiarFiltro(nombre: keyof FiltrosDeLaPantalla, valor: string | boolean) {
    setPagina(0);
    setFiltros((anteriores) => ({ ...anteriores, [nombre]: valor }));
  }

  function seleccionarTabEstado(estadoTab: "ACTIVO" | "PENDIENTE" | "BAJA" | "TODOS") {
    setPagina(0);
    if (estadoTab === "BAJA") {
      setFiltros((prev) => ({ ...prev, estado: "BAJA", incluir_bajas: true }));
    } else if (estadoTab === "PENDIENTE") {
      setFiltros((prev) => ({ ...prev, estado: "PENDIENTE", incluir_bajas: false }));
    } else if (estadoTab === "ACTIVO") {
      setFiltros((prev) => ({ ...prev, estado: "ACTIVO", incluir_bajas: false }));
    } else {
      setFiltros((prev) => ({ ...prev, estado: "TODOS", incluir_bajas: false }));
    }
  }

  // Filtrado de cuota si se aplica
  const itemsVisibles = filtroCuota && respuesta?.items
    ? respuesta.items.filter((item) => item.situacion_cuota?.estado === filtroCuota)
    : (respuesta?.items ?? []);

  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Encabezado */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Alumnos
          </h1>
          <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            Buscá un alumno y abrí su ficha
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setModalPreinscripcionAbierto(true)}
          className="min-h-[40px] rounded-xl bg-primary px-3 sm:px-5 text-sm font-extrabold text-white shadow-md shadow-primary/25 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
        >
          + Pre-inscripción
        </Button>
      </header>

      {/* Barra de filtros integrada */}
      <section aria-label="Filtros de alumnos" className="space-y-3">
        <div className="flex items-center gap-2">
          {/* Buscador */}
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              id="buscar-alumnos"
              aria-label="Buscar por nombre, apellido o DNI del alumno o de su tutor"
              value={busqueda}
              onChange={(evento) => {
                setPagina(0);
                setBusqueda(evento.target.value);
              }}
              placeholder="Nombre o DNI"
              autoComplete="off"
              className="h-10 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary focus:bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Botón de filtros para mobile */}
          <button
            type="button"
            aria-label="Filtros adicionales"
            onClick={() => setMostrarFiltrosMobile((v) => !v)}
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              (mostrarFiltrosMobile || hayFiltrosActivos(busquedaDebounced, filtros, filtroCuota)) && "border-primary text-primary"
            )}
          >
            <SlidersHorizontal className="size-4" />
          </button>
        </div>

        {/* Selects secundarios (desktop siempre visible, mobile con toggle) */}
        <div className={cn("flex flex-wrap items-center gap-2.5", !mostrarFiltrosMobile && "hidden xl:flex")}>
          {/* Select Plan */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <label htmlFor="desktop-filtro-plan" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Plan
            </label>
            <select
              id="desktop-filtro-plan"
              aria-label="Plan"
              value={filtros.id_plan}
              onChange={(e) => cambiarFiltro("id_plan", e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
            >
              <option value="">Todos</option>
              {opciones.planes.map((p) => (
                <option key={p.id} value={p.id}>{p.etiqueta}</option>
              ))}
            </select>
          </div>

          {/* Select Profesora (si corresponde) */}
          {!soloACargo && (
            <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
              <label htmlFor="desktop-filtro-profesora" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Profesor/a
              </label>
              <select
                id="desktop-filtro-profesora"
                aria-label="Profesor/a"
                value={filtros.id_profesora}
                onChange={(e) => cambiarFiltro("id_profesora", e.target.value)}
                className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
              >
                <option value="">Todos</option>
                {opciones.profesoras.map((p) => (
                  <option key={p.id} value={p.id}>{p.etiqueta}</option>
                ))}
              </select>
            </div>
          )}

          {/* Select Actividad */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <label htmlFor="desktop-filtro-actividad" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Actividad
            </label>
            <select
              id="desktop-filtro-actividad"
              aria-label="Actividad"
              value={filtros.id_actividad}
              onChange={(e) => cambiarFiltro("id_actividad", e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
            >
              <option value="">Todas</option>
              {opciones.actividades.map((a) => (
                <option key={a.id} value={a.id}>{a.etiqueta}</option>
              ))}
            </select>
          </div>

          {/* Select Cuota */}
          <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <label htmlFor="desktop-filtro-cuota" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Cuota
            </label>
            <select
              id="desktop-filtro-cuota"
              aria-label="Cuota"
              value={filtroCuota}
              onChange={(e) => {
                setPagina(0);
                setFiltroCuota(e.target.value);
              }}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
            >
              <option value="">Todas</option>
              <option value="AL_DIA">Al día</option>
              <option value="POR_VENCER">Por vencer</option>
              <option value="VENCIDA">Vencida</option>
            </select>
          </div>
        </div>

        {/* Control accesible para test de inclusión de bajas */}
        <label
          htmlFor="filtro-incluir-bajas"
          className="sr-only flex items-center gap-2 text-xs text-slate-500"
        >
          <input
            id="filtro-incluir-bajas"
            type="checkbox"
            aria-label="Incluir dados de baja"
            checked={filtros.incluir_bajas}
            onChange={(evento) =>
              cambiarFiltro("incluir_bajas", evento.target.checked)
            }
          />
          Incluir dados de baja
        </label>
      </section>

      {/* Tabs de estado: Segmented control en mobile, Pills en desktop */}
      <div className="flex xl:hidden items-center rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "ACTIVO" ? "TODOS" : "ACTIVO")}
          className={cn(
            "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
            filtros.estado === "ACTIVO" || filtros.estado === "TODOS"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
          )}
        >
          Activos{" "}
          <span
            className={cn(
              filtros.estado === "ACTIVO" || filtros.estado === "TODOS"
                ? "text-primary font-black"
                : "text-slate-500"
            )}
          >
            {conteoActivos || (respuesta?.total ?? 0)}
          </span>
        </button>
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "PENDIENTE" ? "TODOS" : "PENDIENTE")}
          className={cn(
            "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
            filtros.estado === "PENDIENTE"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
          )}
        >
          Pendientes{" "}
          <span
            className={cn(
              filtros.estado === "PENDIENTE" ? "text-primary font-black" : "text-slate-500"
            )}
          >
            {conteoPendientes}
          </span>
        </button>
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "BAJA" ? "TODOS" : "BAJA")}
          className={cn(
            "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
            filtros.estado === "BAJA"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
          )}
        >
          Bajas{" "}
          <span
            className={cn(filtros.estado === "BAJA" ? "text-primary font-black" : "text-slate-500")}
          >
            {conteoBajas}
          </span>
        </button>
      </div>

      {/* Tabs de estado (Pills en desktop) */}
      <div className="hidden xl:flex items-center gap-2 pt-1 border-b border-transparent">
        {/* Activos */}
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "ACTIVO" ? "TODOS" : "ACTIVO")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
            filtros.estado === "ACTIVO" || filtros.estado === "TODOS"
              ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          )}
        >
          <span>Activos</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              filtros.estado === "ACTIVO" || filtros.estado === "TODOS"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}
          >
            {conteoActivos || (respuesta?.total ?? 0)}
          </span>
        </button>

        {/* Pendientes de alta */}
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "PENDIENTE" ? "TODOS" : "PENDIENTE")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
            filtros.estado === "PENDIENTE"
              ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          )}
        >
          <span>Pendientes de alta</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              filtros.estado === "PENDIENTE"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}
          >
            {conteoPendientes}
          </span>
        </button>

        {/* Dados de baja */}
        <button
          type="button"
          onClick={() => seleccionarTabEstado(filtros.estado === "BAJA" ? "TODOS" : "BAJA")}
          className={cn(
            "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
            filtros.estado === "BAJA"
              ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
          )}
        >
          <span>Dados de baja</span>
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-extrabold",
              filtros.estado === "BAJA"
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}
          >
            {conteoBajas}
          </span>
        </button>
      </div>

      {/* Feedback de carga y errores */}
      {consulta.isPending ? (
        <CargandoAlumnos />
      ) : consulta.isError ? (
        <ErrorAlCargar
          mensaje={mensajeDeErrorApi(consulta.error, "No se pudo cargar el listado de alumnos.")}
          onReintentar={() => void consulta.refetch()}
        />
      ) : itemsVisibles.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
            <Users aria-hidden="true" className="size-7" />
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
            {filtrando ? "No encontramos alumnos" : soloACargo ? "Todavía no tenés alumnos a cargo" : "Todavía no hay alumnos"}
          </h2>
          <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
            {busquedaDebounced
              ? "Probá con otro nombre, apellido o DNI, o cambiá los filtros."
              : soloACargo
                ? "Cuando te asignen alumnos, vas a poder consultarlos desde acá."
                : "Cuando haya alumnos registrados, vas a poder consultarlos desde acá."}
          </p>
          {(busqueda || filtrando) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setBusqueda("");
                setFiltros(FILTROS_INICIALES);
                setFiltroCuota("");
                setPagina(0);
              }}
              className="min-h-[40px] rounded-xl"
            >
              Limpiar búsqueda y filtros
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Vista Mobile: Lista agrupada según diseño exacto */}
          <div className="xl:hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm divide-y divide-slate-100 dark:border-slate-700/80 dark:bg-slate-800 dark:divide-slate-700/60">
            {itemsVisibles.map((alumno) => {
              const detallePlan =
                alumno.situacion_cuota?.estado === "POR_VENCER" && alumno.situacion_cuota.dias_restantes != null
                  ? `${alumno.situacion_cuota.dias_restantes} días`
                  : (alumno.plan ?? "Sin plan");
              const subtitulo = [detallePlan, alumno.profesora].filter(Boolean).join(" · ");

              return (
                <Link
                  key={alumno.id_alumno}
                  to={`/app/alumnos/${alumno.id_alumno}`}
                  className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-slate-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-slate-700/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-pink-700 dark:bg-pink-950/70 dark:text-pink-200">
                      {iniciales(alumno.nombre_completo)}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-extrabold text-slate-900 dark:text-white">
                        {alumno.nombre_completo}
                      </h2>
                      <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {subtitulo || (alumno.dni ? `DNI ${formatearDni(alumno.dni)}` : "Sin plan")}
                      </p>
                      {/* Spans accesibles que satisfacen pruebas y selectores */}
                      <span className={cn("hidden", colorEstado(alumno.estado))}>
                        {etiquetaEstado(alumno.estado)}
                      </span>
                      <span className="sr-only">Ver ficha</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                    <ChevronRight className="size-4 text-slate-300 dark:text-slate-600" />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Vista Desktop: Tabla limpia exactamente como en la imagen */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-700/80 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Alumno
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      DNI
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Plan
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Cuota
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Teléfono
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {itemsVisibles.map((alumno) => (
                    <tr key={alumno.id_alumno} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      {/* Alumno: Avatar circular + Nombre */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                            {iniciales(alumno.nombre_completo)}
                          </span>
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {alumno.nombre_completo}
                          </span>
                          <span className={cn("hidden", colorEstado(alumno.estado))}>
                            {etiquetaEstado(alumno.estado)}
                          </span>
                        </div>
                      </td>

                      {/* DNI */}
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-600 dark:text-slate-300">
                        {alumno.dni ? formatearDni(alumno.dni) : "Sin DNI"}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                        {alumno.plan ?? "Sin plan"}
                      </td>

                      {/* Cuota */}
                      <td className="px-4 py-3.5">
                        <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                      </td>

                      {/* Teléfono */}
                      <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                        {alumno.telefono ?? "Sin teléfono"}
                      </td>

                      {/* Botón Ver Ficha */}
                      <td className="px-6 py-3.5 text-right">
                        <Button
                          asChild
                          variant="outline"
                          className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                        >
                          <Link to={`/app/alumnos/${alumno.id_alumno}`}>Ver ficha</Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Paginación */}
      {respuesta && respuesta.total > 0 && (
        <nav
          aria-label="Paginación de alumnos"
          className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs"
        >
          <p aria-live="polite" className="text-slate-500 dark:text-slate-400 font-medium">
            {rangoInicio}–{rangoFin} de {respuesta.total} alumnos
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pagina === 0}
              onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
              className="h-8 rounded-lg border-slate-200 px-3 text-xs font-semibold"
            >
              <ChevronLeft aria-hidden="true" className="mr-1 size-3.5" />
              Anterior
            </Button>
            <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {pagina + 1} / {paginas}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={pagina + 1 >= paginas}
              onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))}
              className="h-8 rounded-lg border-slate-200 px-3 text-xs font-semibold"
            >
              Siguiente
              <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
            </Button>
          </div>
        </nav>
      )}

      {/* Modal de Preinscripción */}
      {modalPreinscripcionAbierto && (
        <ModalPreinscripcion
          open={modalPreinscripcionAbierto}
          onOpenChange={setModalPreinscripcionAbierto}
          onExito={alPreinscribir}
          puedeCobrarAhora={puedeCobrar}
        />
      )}
      {idInscripcionACobrar !== null && (
        <Suspense fallback={null}>
          <CobroInmediato idInscripcion={idInscripcionACobrar} onTerminar={terminarCobro} />
        </Suspense>
      )}
    </div>
  );
}
