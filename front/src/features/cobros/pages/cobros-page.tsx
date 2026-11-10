import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Banknote,
  ChevronDown,
  Info,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/api/client";
import { fichaAlumnoApiSchema, paginaAlumnosApiSchema } from "@/features/alumnos/schemas/alumno";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { listarPlanes } from "@/features/planes/api/planes-api";
import { calcularCotizacionCobro } from "@/features/cobros/api/cobros-api";
import { listarPromociones } from "@/features/promociones/api/promociones-api";
import {
  ModalRegistrarCobro,
  type DatosAlumnoCobro,
  type DatosInscripcionCobro,
} from "@/features/cobros/components/modal-registrar-cobro";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import { PanelEfectivoARendir } from "@/features/cobros/components/panel-efectivo-a-rendir";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { BarraFiltros } from "@/features/transferencias/components/barra-filtros";
import { ModalDetalleAprobacion } from "@/features/transferencias/components/modal-detalle-aprobacion";
import {
  useAprobarTransferencia,
  useRechazarTransferencia,
  useTransferencias,
} from "@/features/transferencias/hooks/use-transferencias";
import { FILTROS_INICIALES, filtrarTransferencias } from "@/features/transferencias/utils/filtros-transferencias";
import { tramoDePlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";

type FiltroEstadoCuota = "TODOS" | "VENCIDA" | "POR_VENCER" | "AL_DIA";

const PESTANAS_CUOTA: { id: FiltroEstadoCuota; etiqueta: string }[] = [
  { id: "TODOS", etiqueta: "Todos" },
  { id: "VENCIDA", etiqueta: "Vencidas" },
  { id: "POR_VENCER", etiqueta: "Por vencer" },
  { id: "AL_DIA", etiqueta: "Al día" },
];

function etiquetaEstadoCuota(estado?: string): string {
  if (estado === "VENCIDA") return "Vencida";
  if (estado === "POR_VENCER") return "Por vencer";
  if (estado === "AL_DIA") return "Al día";
  return "";
}

const DIA_DE_CALENDARIO = /^\d{4}-(\d{2})-(\d{2})/;

// El vencimiento es un día de calendario que el back manda como medianoche UTC
// ("2026-10-02T00:00:00.000Z"): se toma el día tal cual, porque pasarlo a hora local
// lo corre al día anterior en Argentina.
function formatearFechaCorta(fecha: string | null | undefined): string {
  const partes = fecha ? DIA_DE_CALENDARIO.exec(fecha) : null;
  return partes ? `${partes[2]}/${partes[1]}` : "—";
}

function formatearFechaHoraCorta(fechaIso: string | null | undefined): string {
  if (!fechaIso) return "—";
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const horas = String(d.getHours()).padStart(2, "0");
  const minutos = String(d.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${horas}:${minutos}`;
}

export function CobrosPage() {
  const { panelActivo, tieneLosDosPaneles } = usePanelActivo();
  const enPanelDeProfesora = panelActivo === "PROFESORA";
  return (
    <OwnerLayout>
      {enPanelDeProfesora && tieneLosDosPaneles ? (
        <ConMiIdDeProfesora>
          {(idProfesora) => <PanelDeCobros soloACargo idProfesoraACargo={idProfesora} />}
        </ConMiIdDeProfesora>
      ) : (
        <PanelDeCobros soloACargo={enPanelDeProfesora} />
      )}
    </OwnerLayout>
  );
}

interface PanelDeCobrosProps {
  /** Panel de Profesora: cobra a sus alumnos; verificar transferencias y rendiciones es de la propietaria. */
  soloACargo: boolean;
  /** Filtro fijo por profesora, para la propietaria en su panel de Profesora. */
  idProfesoraACargo?: string;
}

function PanelDeCobros({ soloACargo, idProfesoraACargo }: PanelDeCobrosProps) {
  const { pathname } = useLocation();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const seccionDeRuta = pathname.endsWith("/transferencias")
    ? "transferencias"
    : pathname.endsWith("/efectivo")
      ? "efectivo"
      : pathname.endsWith("/cuotas")
        ? "cuotas"
        : null;
  const tabActiva = !soloACargo
    ? (seccionDeRuta ?? (tabParam === "transferencias" || tabParam === "efectivo" ? tabParam : "cuotas"))
    : "cuotas";

  const [busqueda, setBusqueda] = useState("");
  const [filtroPlan, setFiltroPlan] = useState<string>("TODOS");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [filtroCuota, setFiltroCuota] = useState<FiltroEstadoCuota>("TODOS");
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  // Modales de cobro
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<{
    alumno: DatosAlumnoCobro;
    inscripcion: DatosInscripcionCobro;
  } | null>(null);
  const [comprobanteId, setComprobanteId] = useState<number | null>(null);

  const idAlumnoSeleccionado = alumnoSeleccionado?.alumno.id_alumno;
  const {
    data: alumnoDetalleSeleccionado,
    isLoading: cargandoCotizacion,
    isError: errorCotizacion,
  } = useQuery({
    queryKey: ["alumnos", "detalle-cobro", idAlumnoSeleccionado],
    queryFn: async () => {
      const respuesta = await apiClient.get(`/alumnos/${idAlumnoSeleccionado}`);
      return fichaAlumnoApiSchema.parse(respuesta.data);
    },
    enabled: idAlumnoSeleccionado !== undefined,
    staleTime: 0,
  });
  const { data: promociones = [] } = useQuery({
    queryKey: ["promociones", "cobros"],
    queryFn: listarPromociones,
    enabled: alumnoSeleccionado !== null,
  });

  const cotizacionSeleccionada = useMemo(() => {
    const idInscripcion = alumnoSeleccionado?.inscripcion.id_inscripcion;
    const inscripcion = alumnoDetalleSeleccionado?.inscripciones?.find(
      (item) => item.id_inscripcion === idInscripcion,
    );
    if (!inscripcion) return undefined;
    return calcularCotizacionCobro(
      {
        id: inscripcion.id_inscripcion,
        precioLista: Number(inscripcion.plan_precio.precio),
        idPromocion: inscripcion.id_promocion,
        idPlan: inscripcion.plan.id_plan,
      },
      promociones,
    );
  }, [alumnoDetalleSeleccionado, alumnoSeleccionado, promociones]);

  // Modal flotante de transferencias
  const [transferenciaSeleccionada, setTransferenciaSeleccionada] =
    useState<Transferencia | null>(null);

  const aprobarTransferencia = useAprobarTransferencia();
  const rechazarTransferencia = useRechazarTransferencia();

  // Consulta de transferencias pendientes
  const {
    data: transferenciasData,
    isLoading: cargandoTransferencias,
    refetch: recargarTransferencias,
  } = useTransferencias("PENDIENTE", { orden: "desc" });

  const transferenciasPendientes = useMemo<Transferencia[]>(() => {
    if (!transferenciasData) return [];
    if (Array.isArray(transferenciasData)) return transferenciasData;
    if ("pages" in (transferenciasData as Record<string, unknown>)) {
      const pages = (transferenciasData as { pages: Transferencia[][] }).pages;
      return Array.isArray(pages) ? pages.flat() : [];
    }
    return [];
  }, [transferenciasData]);

  // US-17: búsqueda, fecha y orden sobre las pendientes ya cargadas (el back no los ofrece).
  const [filtrosTransferencias, setFiltrosTransferencias] = useState(FILTROS_INICIALES);
  const transferenciasVisibles = useMemo(
    () => filtrarTransferencias(transferenciasPendientes, filtrosTransferencias),
    [transferenciasPendientes, filtrosTransferencias]
  );
  const limpiarFiltrosTransferencias = () => setFiltrosTransferencias(FILTROS_INICIALES);

  // Consulta de alumnos activos con su inscripción
  const {
    data: alumnosData,
    isLoading: cargandoAlumnos,
    refetch: recargarAlumnos,
  } = useQuery({
    queryKey: ["alumnos", "listado-cobros", idProfesoraACargo ?? null],
    queryFn: async () => {
      const params = idProfesoraACargo ? { limit: 100, id_profesora: idProfesoraACargo } : { limit: 100 };
      const respuesta = await apiClient.get("/alumnos", { params });
      return paginaAlumnosApiSchema.parse(respuesta.data);
    },
  });

  // Consulta de planes para mapear precios vigentes
  const { data: planes = [] } = useQuery({
    queryKey: ["planes", "vigentes"],
    queryFn: listarPlanes,
  });

  const mapaPreciosPlanes = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const plan of planes) {
      if (plan.precioVigente !== null) {
        mapa.set(Number(plan.id), plan.precioVigente);
      }
    }
    return mapa;
  }, [planes]);

  // Alumnos activos con inscripción vigente para cobrar
  const alumnosCobro = useMemo(() => {
    if (!alumnosData?.datos) return [];
    return alumnosData.datos
      .filter((a) => a.estado === "ACTIVO" && a.inscripcion && a.inscripcion.estado === "ACTIVA")
      .map((a) => {
        const idPlan = a.inscripcion!.id_plan;
        const precioPlan = mapaPreciosPlanes.get(idPlan) ?? 0;
        return {
          id_alumno: a.id_alumno,
          nombre: a.usuario.nombre,
          apellido: a.usuario.apellido,
          dni: a.usuario.dni,
          id_inscripcion: a.inscripcion!.id_inscripcion,
          nombre_plan: a.inscripcion!.nombre_plan,
          profesora: a.inscripcion!.nombre_profesora ?? "—",
          id_plan: idPlan,
          precio_vigente: precioPlan,
          situacion_cuota: a.situacion_cuota,
        };
      })
      .sort((a, b) => {
        const peso = (estado?: string) =>
          estado === "VENCIDA" ? 1 : estado === "POR_VENCER" ? 2 : estado === "AL_DIA" ? 3 : 4;
        const pesoA = peso(a.situacion_cuota?.estado);
        const pesoB = peso(b.situacion_cuota?.estado);
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.apellido.localeCompare(b.apellido, "es");
      });
  }, [alumnosData, mapaPreciosPlanes]);

  const opcionesProfesoras = useMemo(() => {
    const nombres = new Set<string>();
    for (const a of alumnosCobro) {
      if (a.profesora && a.profesora !== "—") nombres.add(a.profesora);
    }
    return Array.from(nombres).sort((a, b) => a.localeCompare(b, "es"));
  }, [alumnosCobro]);

  // Conteo de estados
  const conteoVencidas = useMemo(
    () => alumnosCobro.filter((a) => a.situacion_cuota?.estado === "VENCIDA").length,
    [alumnosCobro]
  );
  const conteoPorVencer = useMemo(
    () => alumnosCobro.filter((a) => a.situacion_cuota?.estado === "POR_VENCER").length,
    [alumnosCobro]
  );
  const conteoAlDia = useMemo(
    () => alumnosCobro.filter((a) => a.situacion_cuota?.estado === "AL_DIA").length,
    [alumnosCobro]
  );
  const conteosPorCuota: Record<FiltroEstadoCuota, number> = {
    TODOS: alumnosCobro.length,
    VENCIDA: conteoVencidas,
    POR_VENCER: conteoPorVencer,
    AL_DIA: conteoAlDia,
  };

  // Filtrado de alumnos
  const alumnosFiltrados = useMemo(() => {
    return alumnosCobro.filter((alumno) => {
      if (busqueda.trim()) {
        const textoNormalizado = normalizarParaBuscar(busqueda);
        const nombreCompleto = normalizarParaBuscar(`${alumno.nombre} ${alumno.apellido}`);
        const dni = alumno.dni ?? "";
        if (!nombreCompleto.includes(textoNormalizado) && !dni.includes(busqueda.trim())) {
          return false;
        }
      }

      if (filtroPlan !== "TODOS" && String(alumno.id_plan) !== filtroPlan) {
        return false;
      }

      if (!soloACargo && filtroProfesora !== "TODAS" && alumno.profesora !== filtroProfesora) {
        return false;
      }

      if (filtroCuota !== "TODOS") {
        if (alumno.situacion_cuota?.estado !== filtroCuota) return false;
      }

      return true;
    });
  }, [alumnosCobro, busqueda, filtroPlan, filtroProfesora, filtroCuota, soloACargo]);

  const hayFiltrosCuotasActivos =
    busqueda.trim() !== "" ||
    filtroPlan !== "TODOS" ||
    (!soloACargo && filtroProfesora !== "TODAS") ||
    filtroCuota !== "TODOS";

  const limpiarFiltrosCuotas = () => {
    setBusqueda("");
    setFiltroPlan("TODOS");
    setFiltroProfesora("TODAS");
    setFiltroCuota("TODOS");
  };

  function abrirCobro(alumno: (typeof alumnosCobro)[number]) {
    setAlumnoSeleccionado({
      alumno: {
        id_alumno: alumno.id_alumno,
        nombre: alumno.nombre,
        apellido: alumno.apellido,
        dni: alumno.dni,
      },
      inscripcion: {
        id_inscripcion: alumno.id_inscripcion,
        id_plan: alumno.id_plan,
        nombre_plan: alumno.nombre_plan,
        precio_vigente: alumno.precio_vigente,
        situacion_cuota: alumno.situacion_cuota,
      },
    });
  }

  function handleCobroExitoso(idPago: number) {
    setAlumnoSeleccionado(null);
    setComprobanteId(idPago);
    void recargarAlumnos();
  }

  const handleAprobarTransferencia = (
    transferencia: Transferencia,
    confirmarMontoDistinto: boolean
  ) => {
    aprobarTransferencia.mutate(
      { id: transferencia.id, confirmarMontoDistinto },
      {
        onSuccess: () => {
          setTransferenciaSeleccionada(null);
          void recargarAlumnos();
          void recargarTransferencias();
          toast.success("Transferencia aprobada", {
            description: `${transferencia.alumno.nombre} ${transferencia.alumno.apellido} quedó al día.`,
          });
        },
        onError: () => {
          toast.error("No se pudo aprobar la transferencia");
        },
      }
    );
  };

  const handleRechazarTransferencia = (transferencia: Transferencia, motivo: string) => {
    rechazarTransferencia.mutate(
      { id: transferencia.id, motivo },
      {
        onSuccess: () => {
          setTransferenciaSeleccionada(null);
          void recargarAlumnos();
          void recargarTransferencias();
          toast.success("Transferencia rechazada", {
            description: `${transferencia.alumno.nombre} ${transferencia.alumno.apellido}: el motivo quedó registrado.`,
          });
        },
        onError: () => {
          toast.error("No se pudo rechazar la transferencia");
        },
      }
    );
  };

  const tituloSeccion = soloACargo
    ? "Cobros"
    : tabActiva === "transferencias"
      ? "Transferencias por verificar"
      : tabActiva === "efectivo"
        ? "Efectivo a rendir"
        : "Cuotas";

  const descripcionSeccion = soloACargo
    ? "Registrá el cobro de la cuota de tus alumnos, en efectivo o por transferencia."
    : tabActiva === "transferencias"
      ? "Verificá en tu cuenta las transferencias informadas por los alumnos y aprobalas o rechazalas."
      : tabActiva === "efectivo"
        ? "Controlá el efectivo cobrado por las profesoras pendiente de entrega y el historial rendido."
        : "Buscá el estado de cuota de los alumnos y registrá cobros en efectivo o por transferencia.";

  return (
    <div className="space-y-5 min-w-0">
      {/* ENCABEZADO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {tituloSeccion}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            {descripcionSeccion}
          </p>
        </div>
      </header>

      {/* CONTENIDO SEGÚN SECCIÓN */}

      {/* TAB 1: CUOTAS */}
      {tabActiva === "cuotas" && (
        <div className="space-y-4">
          {/* Barra de búsqueda y filtros en píldoras */}
          <section aria-label="Filtros de cuotas" className="space-y-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Buscador */}
              <div className="relative flex-1 min-w-[280px] max-w-sm">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                />
                <Input
                  id="buscar-alumno-cuota"
                  aria-label="Buscar por nombre, apellido o DNI"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, apellido o DNI..."
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
                  (mostrarFiltrosMobile || hayFiltrosCuotasActivos) && "border-primary text-primary",
                )}
              >
                <SlidersHorizontal className="size-4" />
              </button>

              {/* Selects secundarios en píldoras */}
              <div className={cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !mostrarFiltrosMobile && "hidden xl:flex")}>
                <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                  <label htmlFor="filtro-plan-cobros" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    Plan
                  </label>
                  <select
                    id="filtro-plan-cobros"
                    aria-label="Plan"
                    value={filtroPlan}
                    onChange={(e) => setFiltroPlan(e.target.value)}
                    className="appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
                  >
                    <option value="TODOS">Todos</option>
                    {planes.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2 size-4 text-slate-400" />
                </div>

                {!soloACargo && (
                  <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                    <label htmlFor="filtro-profesora-cobros" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      Profesora
                    </label>
                    <select
                      id="filtro-profesora-cobros"
                      aria-label="Profesora"
                      value={filtroProfesora}
                      onChange={(e) => setFiltroProfesora(e.target.value)}
                      className="appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
                    >
                      <option value="TODAS">Todas</option>
                      {opcionesProfesoras.map((prof) => (
                        <option key={prof} value={prof}>
                          {prof}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 size-4 text-slate-400" />
                  </div>
                )}

                {hayFiltrosCuotasActivos && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={limpiarFiltrosCuotas}
                    className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </section>

          {/* Pestañas de estado para mobile */}
          <div className="flex lg:hidden items-center gap-1 overflow-x-auto rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {PESTANAS_CUOTA.map((pestana) => {
              const activa = filtroCuota === pestana.id;
              const conteo = conteosPorCuota[pestana.id];

              return (
                <button
                  key={pestana.id}
                  type="button"
                  onClick={() =>
                    setFiltroCuota(
                      pestana.id !== "TODOS" && filtroCuota === pestana.id ? "TODOS" : pestana.id,
                    )
                  }
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

          {/* TABLA DE CUOTAS */}
          {cargandoAlumnos ? (
            <div
              role="status"
              aria-label="Cargando cuotas"
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900"
            >
              <div className="hidden lg:flex items-center gap-2 border-b border-slate-100 p-3 dark:border-slate-800">
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="hidden md:block h-4 w-24" />
                    <Skeleton className="hidden sm:block h-4 w-28" />
                    <Skeleton className="hidden lg:block h-5 w-16 rounded-md" />
                    <Skeleton className="h-8 w-28 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              {/* Header de pestañas para desktop dentro de la tarjeta */}
              <div
                className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                role="group"
                aria-label="Filtrar por estado de cuota"
              >
                {PESTANAS_CUOTA.map((pestana) => {
                  const activa = filtroCuota === pestana.id;
                  const conteo = conteosPorCuota[pestana.id];

                  return (
                    <button
                      key={pestana.id}
                      type="button"
                      aria-label={pestana.etiqueta}
                      onClick={() =>
                        setFiltroCuota(
                          pestana.id !== "TODOS" && filtroCuota === pestana.id
                            ? "TODOS"
                            : pestana.id,
                        )
                      }
                      className={cn(
                        "inline-flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
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

              {alumnosFiltrados.length === 0 ? (
                <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
                  <Users className="size-8 text-slate-400" />
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    No se encontraron cuotas
                  </h3>
                  <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                    Probá ajustando la búsqueda o el filtro de estado.
                  </p>
                  {hayFiltrosCuotasActivos && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={limpiarFiltrosCuotas}
                      className="h-8 rounded-lg text-xs"
                    >
                      Limpiar filtros
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto lg:block">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                        <tr>
                          <th scope="col" className="px-6 py-3.5">
                            Alumno
                          </th>
                          <th scope="col" className="px-4 py-3.5">
                            Plan
                          </th>
                          <th scope="col" className="px-4 py-3.5">
                            Profesor/a
                          </th>
                          <th scope="col" className="px-4 py-3.5">
                            Vencimiento
                          </th>
                          {filtroCuota === "TODOS" && (
                            <th scope="col" className="px-4 py-3.5">
                              Estado
                            </th>
                          )}
                          <th scope="col" className="px-4 py-3.5">
                            Monto
                          </th>
                          <th scope="col" className="px-6 py-3.5 text-right">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {alumnosFiltrados.map((alumno) => {
                          const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
                          const vencimientoCorto = formatearFechaCorta(
                            alumno.situacion_cuota?.fecha_vencimiento
                          );

                          return (
                            <tr
                              key={alumno.id_alumno}
                              className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                            >
                              {/* Alumno */}
                              <td className="px-6 py-3.5">
                                <div className="flex items-center gap-3">
                                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                                    {inicialesDe(alumno.nombre, alumno.apellido)}
                                  </span>
                                  <Link
                                    to={`/app/alumnos/${alumno.id_alumno}`}
                                    className="font-bold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                                  >
                                    {nombreCompleto}
                                  </Link>
                                </div>
                              </td>

                              {/* Plan */}
                              <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                                {alumno.nombre_plan}
                              </td>

                              {/* Profesora */}
                              <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                                {alumno.profesora}
                              </td>

                              {/* Vencimiento */}
                              <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                                {vencimientoCorto}
                              </td>

                              {/* Estado (solo en Todos igual que Ausentes) */}
                              {filtroCuota === "TODOS" && (
                                <td className="px-4 py-3.5">
                                  <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                                </td>
                              )}

                              {/* Monto */}
                              <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                                {formatearPrecio(alumno.precio_vigente)}
                              </td>

                              {/* Acción: Registrar cobro */}
                              <td className="px-6 py-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => abrirCobro(alumno)}
                                  aria-label={`Cobrar cuota de ${nombreCompleto}`}
                                  className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                                >
                                  Registrar cobro
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Rows */}
                  <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                    {alumnosFiltrados.map((alumno) => {
                      const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
                      const vencimientoCorto = formatearFechaCorta(
                        alumno.situacion_cuota?.fecha_vencimiento
                      );
                      const estadoTexto = etiquetaEstadoCuota(alumno.situacion_cuota?.estado);

                      return (
                        <div
                          key={alumno.id_alumno}
                          className="flex items-center justify-between gap-3 px-4 py-3.5"
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                              {inicialesDe(alumno.nombre, alumno.apellido)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <Link
                                to={`/app/alumnos/${alumno.id_alumno}`}
                                className="text-sm font-bold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300 truncate block"
                              >
                                {nombreCompleto}
                              </Link>
                              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                {alumno.nombre_plan} · Vence {vencimientoCorto} · {formatearPrecio(alumno.precio_vigente)}
                                {filtroCuota === "TODOS" && estadoTexto ? ` · ${estadoTexto}` : ""}
                              </p>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => abrirCobro(alumno)}
                            aria-label={`Cobrar cuota de ${nombreCompleto}`}
                            className="h-8 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                          >
                            Registrar cobro
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: TRANSFERENCIAS POR VERIFICAR */}
      {tabActiva === "transferencias" && (
        <div className="space-y-4 w-full min-w-0 max-w-full">
          {/* Banner celeste de aviso */}
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200/80 bg-sky-50/60 p-4 text-xs font-semibold text-sky-900 dark:border-sky-800/40 dark:bg-sky-950/20 dark:text-sky-200">
            <Info className="size-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              Fijate en tu cuenta que la plata haya entrado y aprobala. Tenés 24 h desde que se
              informó.
            </span>
          </div>

          {transferenciasPendientes.length > 0 && (
            <BarraFiltros
              filtros={filtrosTransferencias}
              onChange={setFiltrosTransferencias}
              onLimpiar={limpiarFiltrosTransferencias}
            />
          )}

          {/* TABLA DE TRANSFERENCIAS */}
          {cargandoTransferencias ? (
            <div
              role="status"
              aria-label="Cargando transferencias"
              className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900"
            >
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="hidden md:block h-4 w-24" />
                    <Skeleton className="hidden sm:block h-4 w-28" />
                    <Skeleton className="hidden lg:block h-4 w-20" />
                    <Skeleton className="h-8 w-36 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ) : transferenciasPendientes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-14 text-center shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <Banknote className="size-8 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                No hay transferencias pendientes
              </h3>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                Cuando se informe una transferencia, va a figurar acá para su verificación.
              </p>
            </div>
          ) : transferenciasVisibles.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-5 py-14 text-center shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              <Search className="size-8 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sin resultados</h3>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Ninguna transferencia pendiente coincide con los filtros.
              </p>
              <Button type="button" variant="outline" onClick={limpiarFiltrosTransferencias} className="h-8 rounded-lg text-xs">
                Limpiar filtros
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Alumno
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Fecha
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Titular
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Transfirió
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Informada
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {transferenciasVisibles.map((transferencia) => {
                      const tramo = tramoDePlazo(transferencia);
                      const fechaFormateada = formatearFechaHoraCorta(
                        transferencia.realizadaEl
                      );
                      const textoPlazo =
                        tramo === "vencida"
                          ? `Hace ${transferencia.horasDesdeLaCarga} h · pasó el plazo`
                          : `Hace ${transferencia.horasDesdeLaCarga} h`;

                      return (
                        <tr
                          key={transferencia.id}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        >
                          {/* Alumno */}
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                                {inicialesDe(
                                  transferencia.alumno.nombre,
                                  transferencia.alumno.apellido
                                )}
                              </span>
                              <Link
                                to={`/app/alumnos/${transferencia.alumno.id}`}
                                className="font-bold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                              >
                                {transferencia.alumno.nombre} {transferencia.alumno.apellido}
                              </Link>
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {fechaFormateada}
                          </td>

                          {/* Titular */}
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {transferencia.titularCuenta || "—"}
                          </td>

                          {/* Transfirió */}
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {formatearPrecio(transferencia.monto)}
                          </td>

                          {/* Informada (texto simple sin colores ni fondos) */}
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {textoPlazo}
                          </td>

                          {/* Acciones: Ver detalle y Aprobar */}
                          <td className="px-6 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setTransferenciaSeleccionada(transferencia)}
                                className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                              >
                                Ver detalle
                              </Button>
                              <Button
                                type="button"
                                onClick={() => setTransferenciaSeleccionada(transferencia)}
                                className="h-8 rounded-lg bg-primary px-3 text-xs font-bold text-white shadow-2xs hover:bg-primary-dark"
                              >
                                Aprobar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Rows */}
              <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
                {transferenciasVisibles.map((transferencia) => {
                  const tramo = tramoDePlazo(transferencia);
                  const fechaFormateada = formatearFechaHoraCorta(
                    transferencia.realizadaEl
                  );
                  const textoPlazo =
                    tramo === "vencida"
                      ? `Hace ${transferencia.horasDesdeLaCarga} h · pasó el plazo`
                      : `Hace ${transferencia.horasDesdeLaCarga} h`;
                  const nombreCompleto = `${transferencia.alumno.nombre} ${transferencia.alumno.apellido}`;

                  return (
                    <div
                      key={transferencia.id}
                      className="flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                          {inicialesDe(
                            transferencia.alumno.nombre,
                            transferencia.alumno.apellido
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/app/alumnos/${transferencia.alumno.id}`}
                            className="text-sm font-bold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300 truncate block"
                          >
                            {nombreCompleto}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {fechaFormateada} · {formatearPrecio(transferencia.monto)} · {textoPlazo}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setTransferenciaSeleccionada(transferencia)}
                          aria-label={`Ver detalle de transferencia de ${nombreCompleto}`}
                          className="h-8 rounded-lg border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                        >
                          Ver detalle
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setTransferenciaSeleccionada(transferencia)}
                          aria-label={`Aprobar transferencia de ${nombreCompleto}`}
                          className="h-8 rounded-lg bg-primary px-2.5 text-xs font-bold text-white shadow-2xs hover:bg-primary-dark"
                        >
                          Aprobar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: EFECTIVO A RENDIR */}
      {tabActiva === "efectivo" && <PanelEfectivoARendir />}

      {/* Modal de cobro de cuota */}
      {alumnoSeleccionado && (
        <ModalRegistrarCobro
          abierto={alumnoSeleccionado !== null}
          onClose={() => setAlumnoSeleccionado(null)}
          alumno={alumnoSeleccionado.alumno}
          inscripcion={alumnoSeleccionado.inscripcion}
          cotizacion={cotizacionSeleccionada}
          plan={{
            id: String(alumnoSeleccionado.inscripcion.id_plan),
            nombre: alumnoSeleccionado.inscripcion.nombre_plan,
          }}
          promociones={promociones.filter(
            (promocion) =>
              promocion.estado === "ACTIVA" &&
              promocion.activo &&
              promocion.planes.some((plan) => plan.id === String(alumnoSeleccionado.inscripcion.id_plan)),
          )}
          cargandoCotizacion={cargandoCotizacion}
          errorCotizacion={errorCotizacion}
          onExito={handleCobroExitoso}
          onTransferenciaInformada={() => {
            setAlumnoSeleccionado(null);
            void recargarAlumnos();
            void recargarTransferencias();
          }}
        />
      )}

      {/* Modal de comprobante */}
      {comprobanteId !== null && (
        <ModalComprobante
          idPago={comprobanteId}
          abierto={comprobanteId !== null}
          onClose={() => setComprobanteId(null)}
        />
      )}

      {/* Modal flotante de aprobación y detalle de transferencia */}
      {transferenciaSeleccionada && (
        <ModalDetalleAprobacion
          open={transferenciaSeleccionada !== null}
          transferencia={transferenciaSeleccionada}
          onClose={() => setTransferenciaSeleccionada(null)}
          onAprobar={handleAprobarTransferencia}
          onRechazar={handleRechazarTransferencia}
          aprobando={aprobarTransferencia.isPending}
          rechazando={rechazarTransferencia.isPending}
        />
      )}
    </div>
  );
}
