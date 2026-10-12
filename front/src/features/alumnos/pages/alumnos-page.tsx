import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  Search,
  UserRound,
  Users,
} from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActividades } from "@/features/actividades/hooks/use-actividades";
import type { FiltrosAlumnos } from "@/features/alumnos/api/alumnos-api";
import { useAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { ModalPreinscripcion } from "@/features/alumnos/components/preinscripcion/ModalPreinscripcion";
import { listarProfesoras } from "@/features/horarios/api/horarios-api";
import { PROFESORAS_QUERY_KEY } from "@/features/horarios/hooks/useHorarios";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import { cn } from "@/utils/cn";

const TAMANO_PAGINA = 25;
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

// Las opciones de plan, profesora y actividad salen del back (US-11, US-04 y US-03).
function useOpcionesDeFiltros() {
  const planes = usePlanes();
  const actividades = useActividades();
  const profesoras = useQuery({ queryKey: PROFESORAS_QUERY_KEY, queryFn: listarProfesoras, staleTime: 5 * 60_000 });
  return useMemo(
    () => ({
      planes: (planes.data ?? []).map((plan): OpcionFiltro => ({ id: plan.id, etiqueta: plan.nombre })),
      profesoras: (profesoras.data ?? []).map((profesora): OpcionFiltro => ({ id: profesora.id, etiqueta: `${profesora.nombre} ${profesora.apellido}` })),
      actividades: (actividades.data ?? []).map((actividad): OpcionFiltro => ({ id: actividad.id, etiqueta: actividad.nombre })),
    }),
    [planes.data, profesoras.data, actividades.data],
  );
}

function hayFiltrosActivos(busqueda: string, filtros: FiltrosDeLaPantalla): boolean {
  return (
    busqueda.trim() !== "" ||
    filtros.estado !== "TODOS" ||
    filtros.id_plan !== "" ||
    filtros.id_profesora !== "" ||
    filtros.id_actividad !== "" ||
    filtros.incluir_bajas
  );
}

function etiquetaEstado(estado: string): string {
  if (estado === "ACTIVO") return "Activo";
  if (estado === "PENDIENTE") return "Pendiente de alta";
  return "Baja";
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

function iniciales(nombre: string): string {
  return nombre
    .split(/\s+/u)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toLocaleUpperCase("es");
}

function Filtro({
  id,
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: { id: string; etiqueta: string }[];
  onChange: (valor: string) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="grid min-w-0 gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
    >
      {etiqueta}
      <select
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-base font-normal text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82] md:text-sm dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100"
      >
        {opciones.map((opcion) => (
          <option key={opcion.id} value={opcion.id}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AlumnosPage() {
  const [busqueda, setBusqueda] = useState("");
  const [busquedaDebounced, setBusquedaDebounced] = useState("");
  const [filtros, setFiltros] = useState<FiltrosDeLaPantalla>(FILTROS_INICIALES);
  const [pagina, setPagina] = useState(0);
  const [modalPreinscripcionAbierto, setModalPreinscripcionAbierto] = useState(false);

  useEffect(() => {
    const temporizador = window.setTimeout(() => setBusquedaDebounced(busqueda.trim()), 300);
    return () => window.clearTimeout(temporizador);
  }, [busqueda]);

  const opciones = useOpcionesDeFiltros();
  const filtrando = hayFiltrosActivos(busquedaDebounced, filtros);
  const consulta = useAlumnos({
    busqueda: busquedaDebounced,
    ...filtros,
    limit: TAMANO_PAGINA,
    offset: pagina * TAMANO_PAGINA,
  });
  const respuesta = consulta.data;
  const paginas = Math.max(1, Math.ceil((respuesta?.total ?? 0) / TAMANO_PAGINA));
  const rangoInicio = respuesta && respuesta.total > 0 ? respuesta.offset + 1 : 0;
  const rangoFin = Math.min((respuesta?.offset ?? 0) + TAMANO_PAGINA, respuesta?.total ?? 0);

  function cambiarFiltro(nombre: keyof FiltrosDeLaPantalla, valor: string | boolean) {
    setPagina(0);
    setFiltros((anteriores) => ({ ...anteriores, [nombre]: valor }));
  }

  function controlesFiltros(prefijo: string) {
    return (
      <>
        <Filtro
          id={`${prefijo}-filtro-estado`}
          etiqueta="Estado"
          valor={filtros.estado}
          opciones={[
            { id: "TODOS", etiqueta: "Activos y pendientes" },
            { id: "ACTIVO", etiqueta: "Activo" },
            { id: "PENDIENTE", etiqueta: "Pendiente de alta" },
          ]}
          onChange={(valor) => cambiarFiltro("estado", valor)}
        />
        <Filtro
          id={`${prefijo}-filtro-plan`}
          etiqueta="Plan"
          valor={filtros.id_plan}
          opciones={[{ id: "", etiqueta: "Todos los planes" }, ...opciones.planes]}
          onChange={(valor) => cambiarFiltro("id_plan", valor)}
        />
        <Filtro
          id={`${prefijo}-filtro-profesora`}
          etiqueta="Profesora"
          valor={filtros.id_profesora}
          opciones={[{ id: "", etiqueta: "Todas las profesoras" }, ...opciones.profesoras]}
          onChange={(valor) => cambiarFiltro("id_profesora", valor)}
        />
        <Filtro
          id={`${prefijo}-filtro-actividad`}
          etiqueta="Actividad"
          valor={filtros.id_actividad}
          opciones={[{ id: "", etiqueta: "Todas las actividades" }, ...opciones.actividades]}
          onChange={(valor) => cambiarFiltro("id_actividad", valor)}
        />
        <label
          htmlFor={`${prefijo}-incluir-bajas`}
          className="flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-100"
        >
          <input
            id={`${prefijo}-incluir-bajas`}
            type="checkbox"
            checked={filtros.incluir_bajas}
            onChange={(evento) =>
              cambiarFiltro("incluir_bajas", evento.target.checked)
            }
            className="h-4 w-4 accent-[#E91E82]"
          />
          Incluir dados de baja
        </label>
      </>
    );
  }

  return (
    <OwnerLayout>
      <div className="space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
                Alumnos
              </h1>
              {respuesta && (
                <Badge
                  variant="outline"
                  className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
                >
                  {respuesta.total} {respuesta.total === 1 ? "alumno registrado" : "alumnos registrados"}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Buscá y consultá las fichas del centro de entrenamiento.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setModalPreinscripcionAbierto(true)}
            className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
          >
            + Nueva pre-inscripción
          </Button>
        </header>

        <section aria-label="Buscar alumnos" className="mb-4">
          <label htmlFor="buscar-alumnos" className="sr-only">
            Buscar por nombre, apellido o DNI del alumno o de su tutor
          </label>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />
            <Input
              id="buscar-alumnos"
              value={busqueda}
              onChange={(evento) => {
                setPagina(0);
                setBusqueda(evento.target.value);
              }}
              placeholder="Buscar por nombre, apellido o DNI…"
              autoComplete="off"
              className="min-h-12 rounded-xl border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 pl-10 text-base shadow-sm md:min-h-11 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
        </section>

        <details className="relative mb-4 lg:hidden">
          <summary className="flex min-h-[44px] w-fit cursor-pointer list-none items-center gap-2 rounded-full bg-[#181C26] px-4 text-sm font-bold text-white dark:bg-slate-700">
            <Filter aria-hidden="true" className="h-4 w-4" />
            Más filtros
          </summary>
          <div className="absolute inset-x-0 z-20 mt-2 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
            {controlesFiltros("mobile")}
          </div>
        </details>
        <section
          aria-label="Filtros de alumnos"
          className="mb-5 hidden grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid lg:grid-cols-3 2xl:grid-cols-5 dark:border-slate-600 dark:bg-slate-800"
        >
          {controlesFiltros("desktop")}
        </section>
        {consulta.isFetching && !consulta.isPending && (
          <p role="status" className="mb-3 text-sm text-slate-500 dark:text-slate-400">
            Actualizando resultados…
          </p>
        )}

        {consulta.isPending ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-[#E91E82]" />
            Cargando alumnos…
          </div>
        ) : consulta.isError ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
            <AlertCircle aria-hidden="true" className="h-8 w-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(consulta.error, "No se pudo cargar el listado de alumnos.")}
            </p>
            <Button
              type="button"
              onClick={() => void consulta.refetch()}
              className="min-h-[44px] rounded-lg bg-[#BC1266] text-white hover:bg-[#9D1055] dark:bg-pink-700 dark:hover:bg-pink-600"
            >
              Reintentar
            </Button>
          </Card>
        ) : respuesta?.total === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-[#BC1266] dark:bg-pink-950/70 dark:text-pink-200">
              <Users aria-hidden="true" className="h-7 w-7" />
            </span>
            <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">
              {filtrando ? "No encontramos alumnos" : "Todavía no hay alumnos"}
            </h2>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              {busquedaDebounced
                ? "Probá con otro nombre, apellido o DNI, o cambiá los filtros."
                : "Cuando haya alumnos registrados, vas a poder consultarlos desde acá."}
            </p>
            {(busqueda || filtrando) && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBusqueda("");
                  setFiltros(FILTROS_INICIALES);
                  setPagina(0);
                }}
                className="min-h-[44px]"
              >
                Limpiar búsqueda y filtros
              </Button>
            )}
          </Card>
        ) : (
          <>
            <div className="grid gap-3 xl:hidden">
              {respuesta?.items.map((alumno) => (
                <Link
                  key={alumno.id_alumno}
                  to={`/app/alumnos/${alumno.id_alumno}`}
                  className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E91E82]"
                >
                  <Card className="rounded-xl border-slate-200 bg-white p-4 text-slate-900 shadow-sm transition hover:border-pink-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-pink-500">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-sm font-extrabold text-[#BC1266] dark:bg-pink-950/70 dark:text-pink-200">
                        {iniciales(alumno.nombre_completo)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-extrabold text-[#181C26] dark:text-white">
                          {alumno.nombre_completo}
                        </h2>
                        <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-400">
                          DNI {alumno.dni ?? "Sin DNI"} · ALU-{String(alumno.id_alumno).padStart(3, "0")}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-600">
                      <div className="min-w-0">
                        <p className="text-slate-600 dark:text-slate-300">Plan</p>
                        <p className="break-words font-semibold text-slate-800 dark:text-slate-100">
                          {alumno.plan ?? "Sin plan"}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-600 dark:text-slate-300">Estado</p>
                        <p className={cn("font-bold", colorEstado(alumno.estado))}>
                          {etiquetaEstado(alumno.estado)}
                        </p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-slate-600 dark:text-slate-300">Profesora</p>
                        <p className="break-words font-semibold text-slate-800 dark:text-slate-100">
                          {alumno.profesora ?? "A definir"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-600">
                      <span className="min-w-0 break-all text-sm text-slate-600 dark:text-slate-400">
                        {alumno.telefono || "Sin teléfono"}
                      </span>
                      <span className="inline-flex min-h-[44px] shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-bold text-[#BC1266] dark:text-pink-200">
                        <UserRound aria-hidden="true" className="size-4" />
                        Ver ficha
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4">
                        Alumno
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Estado
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Plan
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Teléfono
                      </th>
                      <th scope="col" className="px-4 py-4">
                        Profesora
                      </th>
                      <th scope="col" className="px-6 py-4 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
                    {respuesta?.items.map((alumno) => (
                      <tr key={alumno.id_alumno} className="hover:bg-slate-50 dark:hover:bg-white/5">
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-[#181C26] dark:text-white">
                            {alumno.nombre_completo}
                          </div>
                          <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                            {alumno.dni ? `DNI ${alumno.dni}` : "Sin DNI"}
                            {" · "}ALU-{String(alumno.id_alumno).padStart(3, "0")}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={cn("min-h-7 border px-2 text-sm", colorEstado(alumno.estado))}>
                            {etiquetaEstado(alumno.estado)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">
                          {alumno.plan ?? "Sin plan"}
                        </td>
                        <td className="px-4 py-4 text-slate-800 dark:text-slate-100">
                          {alumno.telefono ?? "Sin teléfono"}
                        </td>
                        <td className="px-4 py-4 text-slate-800 dark:text-slate-100">
                          {alumno.profesora ?? "A definir"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button asChild variant="outline" className="inline-flex h-auto min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-lg border-slate-200 bg-white px-3 py-1.5 text-sm font-bold text-slate-700 transition-colors hover:border-primary hover:text-primary pointer-fine:min-h-0 md:px-2.5 dark:border-white/15 dark:bg-transparent dark:text-slate-200">
                            <Link to={`/app/alumnos/${alumno.id_alumno}`}>Ver ficha</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {respuesta && respuesta.total > 0 && (
          <nav
            aria-label="Paginación de alumnos"
            className="mt-5 flex flex-col items-center justify-between gap-3 sm:flex-row"
          >
            <p aria-live="polite" className="text-sm text-slate-600 dark:text-slate-400">
              {rangoInicio}–{rangoFin} de {respuesta.total} alumnos
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pagina === 0}
                onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
                className="min-h-[44px]"
              >
                <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <span className="px-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {pagina + 1} / {paginas}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={pagina + 1 >= paginas}
                onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))}
                className="min-h-[44px]"
              >
                Siguiente
                <ChevronRight aria-hidden="true" className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </nav>
        )}

        {modalPreinscripcionAbierto && (
          <ModalPreinscripcion
            open={modalPreinscripcionAbierto}
            onOpenChange={setModalPreinscripcionAbierto}
            onExito={() => consulta.refetch()}
          />
        )}
      </div>
    </OwnerLayout>
  );
}
