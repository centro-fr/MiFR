import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Banknote,
  Clock,
  Info,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { usePanelActivo } from "@/components/layout/use-panel-activo";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/api/client";
import { paginaAlumnosApiSchema } from "@/features/alumnos/schemas/alumno";
import { ConMiIdDeProfesora } from "@/features/horarios/components/con-mi-id-de-profesora";
import { listarPlanes } from "@/features/planes/api/planes-api";
import {
  ModalRegistrarCobro,
  type DatosAlumnoCobro,
  type DatosInscripcionCobro,
} from "@/features/cobros/components/modal-registrar-cobro";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import { PanelEfectivoARendir } from "@/features/cobros/components/panel-efectivo-a-rendir";
import { useEfectivoPendiente } from "@/features/cobros/hooks/use-rendiciones";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const tabActiva =
    !soloACargo && (tabParam === "transferencias" || tabParam === "efectivo") ? tabParam : "cuotas";

  const [busqueda, setBusqueda] = useState("");
  const [filtroCuota, setFiltroCuota] = useState<FiltroEstadoCuota>("TODOS");

  // Modales de cobro
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<{
    alumno: DatosAlumnoCobro;
    inscripcion: DatosInscripcionCobro;
  } | null>(null);
  const [comprobanteId, setComprobanteId] = useState<number | null>(null);

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

  // Consulta de efectivo a rendir pendiente (solo propietaria)
  const { data: efectivoData } = useEfectivoPendiente(undefined, { enabled: !soloACargo });

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

      if (filtroCuota !== "TODOS") {
        if (alumno.situacion_cuota?.estado !== filtroCuota) return false;
      }

      return true;
    });
  }, [alumnosCobro, busqueda, filtroCuota]);

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

  function cambiarTab(nuevaTab: "cuotas" | "transferencias" | "efectivo") {
    setSearchParams({ tab: nuevaTab });
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

  return (
    <div className="space-y-5 min-w-0">
      {/* ENCABEZADO */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Cobros
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
            {soloACargo
              ? "Registrá el cobro de la cuota de tus alumnos, en efectivo o por transferencia."
              : "Quién debe, qué transferencias faltan verificar y cuánto efectivo te tienen que rendir."}
          </p>
        </div>
      </header>

      {/* PESTAÑAS PRINCIPALES (solo propietaria) */}
      {!soloACargo && (
        <nav
          aria-label="Secciones de cobros y cuotas"
          className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pt-1 scrollbar-none"
        >
          {/* Cuotas */}
          <button
            type="button"
            onClick={() => cambiarTab("cuotas")}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
              tabActiva === "cuotas"
                ? "border-primary text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <span>Cuotas</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                tabActiva === "cuotas"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {conteoVencidas + conteoPorVencer || alumnosCobro.length}
            </span>
          </button>

          {/* Transferencias por verificar */}
          <button
            type="button"
            onClick={() => cambiarTab("transferencias")}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
              tabActiva === "transferencias"
                ? "border-primary text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <span>Transferencias por verificar</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                tabActiva === "transferencias"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {transferenciasPendientes.length}
            </span>
          </button>

          {/* Efectivo a rendir */}
          <button
            type="button"
            onClick={() => cambiarTab("efectivo")}
            className={cn(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors",
              tabActiva === "efectivo"
                ? "border-primary text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            )}
          >
            <span>Efectivo a rendir</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                tabActiva === "efectivo"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {efectivoData?.cantidad ?? 0}
            </span>
          </button>
        </nav>
      )}

      {/* CONTENIDO SEGÚN TAB */}

      {/* TAB 1: CUOTAS */}
      {tabActiva === "cuotas" && (
        <div className="space-y-4">
          {/* Barra de búsqueda y chips */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Buscador */}
            <div className="relative flex-1 min-w-[240px]">
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
                className="h-10 w-full rounded-xl border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
              />
            </div>

            {/* Chips rápidos de estado */}
            <div
              className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0"
              role="group"
              aria-label="Filtrar por estado de cuota"
            >
              {/* Vencidas */}
              <button
                type="button"
                aria-label="Vencidas"
                onClick={() => setFiltroCuota(filtroCuota === "VENCIDA" ? "TODOS" : "VENCIDA")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                  filtroCuota === "VENCIDA"
                    ? "bg-rose-100 text-rose-800 ring-1 ring-rose-300 dark:bg-rose-950/60 dark:text-rose-200"
                    : "bg-white text-rose-700 border border-slate-200 hover:bg-rose-50 dark:border-slate-700 dark:bg-slate-900 dark:text-rose-300"
                )}
              >
                <span className="size-1.5 rounded-full bg-rose-500" />
                <span>Vencidas</span>
                <span className="font-extrabold">{conteoVencidas}</span>
              </button>

              {/* Por vencer */}
              <button
                type="button"
                aria-label="Por vencer"
                onClick={() =>
                  setFiltroCuota(filtroCuota === "POR_VENCER" ? "TODOS" : "POR_VENCER")
                }
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                  filtroCuota === "POR_VENCER"
                    ? "bg-amber-100 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-950/60 dark:text-amber-200"
                    : "bg-white text-amber-700 border border-slate-200 hover:bg-amber-50 dark:border-slate-700 dark:bg-slate-900 dark:text-amber-300"
                )}
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                <span>Por vencer</span>
                <span className="font-extrabold">{conteoPorVencer}</span>
              </button>

              {/* Al día */}
              <button
                type="button"
                aria-label="Al día"
                onClick={() => setFiltroCuota(filtroCuota === "AL_DIA" ? "TODOS" : "AL_DIA")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all shadow-2xs shrink-0",
                  filtroCuota === "AL_DIA"
                    ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200"
                    : "bg-white text-emerald-700 border border-slate-200 hover:bg-emerald-50 dark:border-slate-700 dark:bg-slate-900 dark:text-emerald-300"
                )}
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                <span>Al día</span>
                <span className="font-extrabold">{conteoAlDia}</span>
              </button>
            </div>
          </div>

          {/* TABLA DE CUOTAS */}
          {cargandoAlumnos ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 className="size-5 animate-spin text-primary" />
              Cargando cuotas…
            </div>
          ) : alumnosFiltrados.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
              <Users className="size-8 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                No se encontraron cuotas
              </h3>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                Probá ajustando la búsqueda o el filtro de estado.
              </p>
              {(busqueda || filtroCuota !== "TODOS") && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setBusqueda("");
                    setFiltroCuota("TODOS");
                  }}
                  className="h-8 rounded-lg text-xs"
                >
                  Limpiar filtros
                </Button>
              )}
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
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
                        <th scope="col" className="px-4 py-3.5">
                          Estado
                        </th>
                        <th scope="col" className="px-4 py-3.5">
                          Monto
                        </th>
                        <th scope="col" className="px-6 py-3.5 text-right">
                          <span className="sr-only">Acciones</span>
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
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {nombreCompleto}
                                </span>
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

                            {/* Estado */}
                            <td className="px-4 py-3.5">
                              <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                            </td>

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
              </div>

              {/* Mobile Cards */}
              <div className="grid gap-3 xl:hidden">
                {alumnosFiltrados.map((alumno) => {
                  const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
                  const vencimientoCorto = formatearFechaCorta(
                    alumno.situacion_cuota?.fecha_vencimiento
                  );

                  return (
                    <Card
                      key={alumno.id_alumno}
                      className="rounded-2xl border-slate-200 bg-white p-4 text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                            {inicialesDe(alumno.nombre, alumno.apellido)}
                          </span>
                          <div>
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                              {nombreCompleto}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {alumno.nombre_plan} · {alumno.profesora}
                            </p>
                          </div>
                        </div>
                        <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Vencimiento: </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {vencimientoCorto}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-white">
                          {formatearPrecio(alumno.precio_vigente)}
                        </span>
                      </div>

                      <div className="mt-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => abrirCobro(alumno)}
                          aria-label={`Cobrar cuota de ${nombreCompleto}`}
                          className="w-full h-9 rounded-xl border-slate-200 text-xs font-bold text-slate-800 hover:text-primary dark:border-slate-700 dark:text-slate-200"
                        >
                          Registrar cobro
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
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
            <div className="flex min-h-52 items-center justify-center gap-2 text-sm font-semibold text-slate-500">
              <Loader2 className="size-5 animate-spin text-primary" />
              Cargando transferencias…
            </div>
          ) : transferenciasPendientes.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
              <Banknote className="size-8 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                No hay transferencias pendientes
              </h3>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                Cuando se informe una transferencia, va a figurar acá para su verificación.
              </p>
            </Card>
          ) : transferenciasVisibles.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-700">
              <Search className="size-8 text-slate-400" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Sin resultados</h3>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Ninguna transferencia pendiente coincide con los filtros.
              </p>
              <Button type="button" variant="outline" onClick={limpiarFiltrosTransferencias} className="min-h-11 rounded-xl font-bold">
                Limpiar filtros
              </Button>
            </Card>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs xl:block dark:border-slate-800 dark:bg-slate-900">
                <div className="overflow-x-auto">
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
                          <span className="sr-only">Acciones</span>
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
                                <span className="font-bold text-sm text-slate-900 dark:text-white">
                                  {transferencia.alumno.nombre} {transferencia.alumno.apellido}
                                </span>
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

                            {/* Informada */}
                            <td className="px-4 py-3.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
                                  tramo === "vencida"
                                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                                    : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                )}
                              >
                                <Clock className="size-3.5" />
                                <span>{textoPlazo}</span>
                              </span>
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
              </div>

              {/* Mobile Cards */}
              <div className="grid w-full min-w-0 gap-3 xl:hidden">
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
                    <Card
                      key={transferencia.id}
                      className="w-full min-w-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-4 text-slate-900 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                            {inicialesDe(
                              transferencia.alumno.nombre,
                              transferencia.alumno.apellido
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {nombreCompleto}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {fechaFormateada}
                              {transferencia.titularCuenta ? ` · Titular: ${transferencia.titularCuenta}` : ""}
                            </p>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 shadow-2xs",
                            tramo === "vencida"
                              ? "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300"
                              : "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300"
                          )}
                        >
                          <Clock className="size-3.5 shrink-0" />
                          <span>{textoPlazo}</span>
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs dark:border-slate-800 min-w-0">
                        <div className="min-w-0 flex-1 truncate pr-2">
                          <span className="text-slate-500 dark:text-slate-400">Titular de cuenta: </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {transferencia.titularCuenta || "—"}
                          </span>
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-white shrink-0">
                          {formatearPrecio(transferencia.monto)}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 pt-2 w-full min-w-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setTransferenciaSeleccionada(transferencia)}
                          aria-label={`Ver detalle de transferencia de ${nombreCompleto}`}
                          className="w-full min-w-0 h-9 rounded-xl border-slate-200 text-xs font-semibold text-slate-800 hover:text-primary dark:border-slate-700 dark:text-slate-200 truncate"
                        >
                          Ver detalle
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setTransferenciaSeleccionada(transferencia)}
                          aria-label={`Aprobar transferencia de ${nombreCompleto}`}
                          className="w-full min-w-0 h-9 rounded-xl bg-primary text-xs font-bold text-white hover:bg-primary-dark shadow-2xs truncate"
                        >
                          Aprobar
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
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
