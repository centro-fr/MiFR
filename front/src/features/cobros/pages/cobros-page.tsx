import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Banknote,
  Loader2,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/api/client";
import { paginaAlumnosApiSchema } from "@/features/alumnos/schemas/alumno";
import { listarPlanes } from "@/features/planes/api/planes-api";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import {
  ModalCobroEfectivo,
  type DatosAlumnoCobro,
  type DatosInscripcionCobro,
} from "@/features/cobros/components/modal-cobro-efectivo";
import { ModalComprobante } from "@/features/cobros/components/modal-comprobante";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { detalleVencimiento } from "@/features/alumnos/utils/situacion-cuota";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";
import { cn } from "@/utils/cn";

type FiltroEstadoCuota = "TODOS" | "POR_COBRAR" | "VENCIDA" | "POR_VENCER" | "AL_DIA";

const OPCIONES_FILTRO_CUOTA: { id: FiltroEstadoCuota; etiqueta: string }[] = [
  { id: "TODOS", etiqueta: "Todos" },
  { id: "POR_COBRAR", etiqueta: "Pendientes" },
  { id: "VENCIDA", etiqueta: "Vencidas" },
  { id: "POR_VENCER", etiqueta: "Por vencer" },
  { id: "AL_DIA", etiqueta: "Al día" },
];

const PESO_ESTADO_CUOTA: Record<string, number> = {
  VENCIDA: 1,
  POR_VENCER: 2,
  AL_DIA: 3,
};

function obtenerPesoCuota(estado?: string): number {
  if (!estado) return 4;
  return PESO_ESTADO_CUOTA[estado] ?? 4;
}

export function CobrosPage() {
  const { hasRole } = usePermissions();
  const esProfesora = hasRole("PROFESORA") && !hasRole("PROPIETARIA");

  const [busqueda, setBusqueda] = useState("");
  const [filtroCuota, setFiltroCuota] = useState<FiltroEstadoCuota>("TODOS");

  // Estado para modales
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState<{
    alumno: DatosAlumnoCobro;
    inscripcion: DatosInscripcionCobro;
  } | null>(null);

  const [comprobanteId, setComprobanteId] = useState<number | null>(null);

  // Consulta de alumnos activos con su inscripción
  const { data: alumnosData, isLoading: cargandoAlumnos, isError: errorAlumnos, refetch: recargarAlumnos } = useQuery({
    queryKey: ["alumnos", "listado-cobros"],
    queryFn: async () => {
      const respuesta = await apiClient.get("/alumnos", { params: { limit: 100 } });
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
          id_plan: idPlan,
          precio_vigente: precioPlan,
          situacion_cuota: a.situacion_cuota,
        };
      })
      .sort((a, b) => {
        // Prioridad 1: Vencidas, Prioridad 2: Por vencer, Prioridad 3: Al día
        const pesoA = obtenerPesoCuota(a.situacion_cuota?.estado);
        const pesoB = obtenerPesoCuota(b.situacion_cuota?.estado);
        if (pesoA !== pesoB) return pesoA - pesoB;
        return a.apellido.localeCompare(b.apellido, "es");
      });
  }, [alumnosData, mapaPreciosPlanes]);

  // Filtrado de alumnos por búsqueda y estado de cuota
  const alumnosFiltrados = useMemo(() => {
    return alumnosCobro.filter((alumno) => {
      // Filtro de búsqueda
      if (busqueda.trim()) {
        const textoNormalizado = normalizarParaBuscar(busqueda);
        const nombreCompleto = normalizarParaBuscar(`${alumno.nombre} ${alumno.apellido}`);
        const dni = alumno.dni ?? "";
        if (!nombreCompleto.includes(textoNormalizado) && !dni.includes(busqueda.trim())) {
          return false;
        }
      }

      // Filtro de estado de cuota
      if (filtroCuota !== "TODOS") {
        if (!alumno.situacion_cuota) return false;
        if (filtroCuota === "POR_COBRAR") {
          return (
            alumno.situacion_cuota.estado === "VENCIDA" ||
            alumno.situacion_cuota.estado === "POR_VENCER"
          );
        }
        if (filtroCuota === "VENCIDA" && alumno.situacion_cuota.estado !== "VENCIDA") return false;
        if (filtroCuota === "POR_VENCER" && alumno.situacion_cuota.estado !== "POR_VENCER") return false;
        if (filtroCuota === "AL_DIA" && alumno.situacion_cuota.estado !== "AL_DIA") return false;
      }

      return true;
    });
  }, [alumnosCobro, busqueda, filtroCuota]);

  const hayFiltros = busqueda.trim() !== "" || filtroCuota !== "TODOS";


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

  const tituloPagina = esProfesora ? "Cobros en efectivo" : "Cobros y Cuotas";

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO (misma estructura, alineado y tipografía que Horarios y Actividades) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
                {tituloPagina}
              </h1>
              <Badge
                variant="outline"
                className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
              >
                {alumnosCobro.length} {alumnosCobro.length === 1 ? "alumno" : "alumnos"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              {esProfesora
                ? "Registrá cobros presenciales de cuotas en efectivo y emití comprobantes digitales para tus alumnos."
                : "Gestión de cobros en efectivo, comprobantes digitales y situación de cuotas de alumnos."}
            </p>
          </div>
        </div>



        {/* Barra de Filtros y Búsqueda (estructura Card idéntica a Alumnos y Planes) */}
        <Card className="rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre, apellido o DNI..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="h-10 w-full rounded-lg border-border bg-slate-50/50 pl-9 text-sm transition-colors focus:bg-white dark:bg-canvas dark:focus:bg-surface-low"
              />
            </div>

            {/* Chips de filtro por situación de cuota */}
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrar por estado de cuota">
              {OPCIONES_FILTRO_CUOTA.map((opcion) => {
                const activo = filtroCuota === opcion.id;
                return (
                  <Button
                    key={opcion.id}
                    type="button"
                    variant="outline"
                    onClick={() => setFiltroCuota(opcion.id)}
                    className={cn(
                      "h-9 rounded-lg px-3 text-xs font-bold transition-all",
                      activo
                        ? "border-primary bg-primary text-white hover:bg-primary-dark hover:text-white dark:border-primary dark:bg-primary dark:text-white"
                        : "border-border bg-transparent text-slate-700 hover:bg-slate-100 hover:text-dark dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
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
                  onClick={() => {
                    setBusqueda("");
                    setFiltroCuota("TODOS");
                  }}
                  className="h-9 px-2.5 text-xs font-bold text-muted-foreground hover:text-dark dark:hover:text-white"
                >
                  <X className="mr-1 size-3.5" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Contenido principal: Carga, Error, Lista vacía o Listado de alumnos */}
        {cargandoAlumnos ? (
          <div
            role="status"
            className="flex min-h-56 items-center justify-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            <Loader2 aria-hidden="true" className="size-5 animate-spin text-primary" />
            Cargando alumnos e inscripciones...
          </div>
        ) : errorAlumnos ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
            <AlertCircle aria-hidden="true" className="size-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No se pudieron cargar los alumnos para cobro.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => recargarAlumnos()}
              className="mt-2 text-sm font-bold"
            >
              Reintentar
            </Button>
          </Card>
        ) : alumnosFiltrados.length === 0 ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
              <Users aria-hidden="true" className="size-7" />
            </span>
            <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">
              No se encontraron alumnos
            </h2>
            <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
              {hayFiltros
                ? "Probá ajustando el término de búsqueda o cambiando el filtro de cuotas."
                : "No hay alumnos activos con inscripción vigente en este momento."}
            </p>
            {hayFiltros && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBusqueda("");
                  setFiltroCuota("TODOS");
                }}
                className="mt-2 text-sm font-bold"
              >
                Limpiar filtros
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Vista Mobile (Tarjetas) – igual a alumnos-page y lista-pendientes */}
            <div className="grid grid-cols-1 gap-3 xl:hidden">
              {alumnosFiltrados.map((alumno) => {
                const detalle = alumno.situacion_cuota ? detalleVencimiento(alumno.situacion_cuota) : null;
                const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
                return (
                  <Card
                    key={alumno.id_alumno}
                    className={cn(
                      "rounded-xl border-border bg-white p-4 shadow-sm dark:bg-surface-low",
                      alumno.situacion_cuota?.estado === "VENCIDA" && "border-rose-300/80 bg-rose-50/15 dark:border-rose-900/40 dark:bg-rose-950/10"
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-primary-dark to-primary text-sm font-bold text-white shadow-xs"
                      >
                        {inicialesDe(alumno.nombre, alumno.apellido)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="break-words text-base font-extrabold text-dark dark:text-white">
                          {nombreCompleto}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {alumno.dni ? `DNI ${alumno.dni}` : "Sin DNI"} · ALU-{String(alumno.id_alumno).padStart(3, "0")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Plan</p>
                        <p className="break-words font-semibold text-slate-800 dark:text-slate-100">
                          {alumno.nombre_plan}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Monto a cobrar</p>
                        <p
                          className={cn(
                            "font-black text-base",
                            alumno.situacion_cuota?.estado === "VENCIDA"
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-dark dark:text-white"
                          )}
                        >
                          {formatearPrecio(alumno.precio_vigente)}
                        </p>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className="text-xs text-muted-foreground">Situación de cuota</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                          {detalle && (
                            <span className="text-xs text-muted-foreground">{detalle}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                      <Button
                        asChild
                        variant="outline"
                        className="h-auto min-h-[44px] rounded-lg border-border bg-transparent px-3 py-1.5 text-sm font-bold text-slate-700 hover:border-primary hover:text-primary pointer-fine:min-h-0 dark:text-slate-200"
                      >
                        <Link to={`/app/alumnos/${alumno.id_alumno}`} aria-label={`Ver ficha de ${nombreCompleto}`}>
                          <UserRound aria-hidden="true" className="mr-1.5 size-4" />
                          Ver ficha
                        </Link>
                      </Button>

                      <Button
                        type="button"
                        onClick={() => abrirCobro(alumno)}
                        aria-label={`Cobrar a ${nombreCompleto}`}
                        className={cn(
                          "h-auto min-h-[44px] rounded-lg px-4 py-1.5 text-sm font-extrabold shadow-md transition-all pointer-fine:min-h-0",
                          alumno.situacion_cuota?.estado === "AL_DIA"
                            ? "border border-border bg-transparent text-slate-700 hover:border-primary hover:text-primary dark:text-slate-200"
                            : "bg-primary text-white hover:bg-primary-dark"
                        )}
                      >
                        <Banknote aria-hidden="true" className="mr-1.5 size-4" />
                        {alumno.situacion_cuota?.estado === "AL_DIA" ? "Cobro adelantado" : "Cobrar"}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Vista Desktop (Tabla) – idéntica a alumnos-page y lista-pendientes */}
            <Card className="hidden overflow-hidden rounded-2xl border-border bg-white shadow-sm xl:block dark:bg-surface-low">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-slate-100 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:bg-white/5 dark:text-slate-200">
                    <tr>
                      <th scope="col" className="px-6 py-4">Alumno</th>
                      <th scope="col" className="px-4 py-4">Plan</th>
                      <th scope="col" className="px-4 py-4">Situación de cuota</th>
                      <th scope="col" className="px-4 py-4">Precio vigente</th>
                      <th scope="col" className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium dark:divide-white/10">
                    {alumnosFiltrados.map((alumno) => {
                      const detalle = alumno.situacion_cuota ? detalleVencimiento(alumno.situacion_cuota) : null;
                      const nombreCompleto = `${alumno.nombre} ${alumno.apellido}`;
                      return (
                        <tr
                          key={alumno.id_alumno}
                          className={cn(
                            "transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5",
                            alumno.situacion_cuota?.estado === "VENCIDA" && "bg-rose-50/20 dark:bg-rose-950/10"
                          )}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                aria-hidden="true"
                                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-primary-dark to-primary text-xs font-bold text-white shadow-xs"
                              >
                                {inicialesDe(alumno.nombre, alumno.apellido)}
                              </span>
                              <div>
                                <h2 className="font-extrabold text-dark dark:text-white">
                                  {nombreCompleto}
                                </h2>
                                <p className="text-xs text-muted-foreground">
                                  {alumno.dni ? `DNI ${alumno.dni}` : "Sin DNI"} · ALU-{String(alumno.id_alumno).padStart(3, "0")}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {alumno.nombre_plan}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <BadgeSituacionCuota situacion={alumno.situacion_cuota} />
                              {detalle && (
                                <span className="text-xs text-muted-foreground">{detalle}</span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                "font-extrabold text-base",
                                alumno.situacion_cuota?.estado === "VENCIDA"
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-dark dark:text-white"
                              )}
                            >
                              {formatearPrecio(alumno.precio_vigente)}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Button
                                asChild
                                variant="outline"
                                className="h-auto min-h-[38px] rounded-lg border-border bg-transparent px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary pointer-fine:min-h-0 dark:text-slate-200"
                              >
                                <Link to={`/app/alumnos/${alumno.id_alumno}`} aria-label={`Ver ficha de ${nombreCompleto}`}>
                                  Ficha
                                </Link>
                              </Button>

                              <Button
                                type="button"
                                onClick={() => abrirCobro(alumno)}
                                aria-label={`Cobrar a ${nombreCompleto}`}
                                className={cn(
                                  "h-auto min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-extrabold shadow-sm transition-all pointer-fine:min-h-0",
                                  alumno.situacion_cuota?.estado === "AL_DIA"
                                    ? "border border-border bg-transparent text-slate-700 hover:border-primary hover:text-primary dark:text-slate-200"
                                    : "bg-primary text-white hover:bg-primary-dark"
                                )}
                              >
                                <Banknote aria-hidden="true" className="mr-1.5 size-3.5" />
                                {alumno.situacion_cuota?.estado === "AL_DIA" ? "Cobro adelantado" : "Cobrar"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}


        {/* Modal para registrar cobro */}
        {alumnoSeleccionado && (
          <ModalCobroEfectivo
            abierto={Boolean(alumnoSeleccionado)}
            onClose={() => setAlumnoSeleccionado(null)}
            alumno={alumnoSeleccionado.alumno}
            inscripcion={alumnoSeleccionado.inscripcion}
            onExito={handleCobroExitoso}
          />
        )}

        {/* Modal de visualización de comprobante */}
        <ModalComprobante
          idPago={comprobanteId}
          abierto={Boolean(comprobanteId)}
          onClose={() => setComprobanteId(null)}
        />
      </div>
    </OwnerLayout>
  );
}
