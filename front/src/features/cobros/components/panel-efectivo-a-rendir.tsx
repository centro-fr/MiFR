import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";
import {
  useEfectivoPendiente,
  useHistorialRendiciones,
  useRendirCobro,
} from "../hooks/use-rendiciones";
import type { CobroSinRendir } from "../schemas/rendicion";
import { TablaHistorialRendiciones } from "./tabla-historial-rendiciones";

type VistaRendicion = "PENDIENTES" | "HISTORIAL";

function formatearFechaCorta(fechaIso: string): string {
  const d = new Date(fechaIso);
  if (isNaN(d.getTime())) return "—";
  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}`;
}

export function PanelEfectivoARendir() {
  const [vista, setVista] = useState<VistaRendicion>("PENDIENTES");
  const [busqueda, setBusqueda] = useState("");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  // Queries
  const {
    data: efectivoData,
    isLoading: cargandoPendientes,
    isError: errorPendientes,
    refetch: recargarPendientes,
  } = useEfectivoPendiente();
  const {
    data: historialData,
    isLoading: cargandoHistorial,
    isError: errorHistorial,
    refetch: recargarHistorial,
  } = useHistorialRendiciones();

  // Mutations
  const rendirCobro = useRendirCobro();
  const procesando = rendirCobro.isPending;

  // Opciones de profesoras para el filtro en píldora
  const opcionesProfesoras = useMemo(() => {
    const mapa = new Map<number, string>();
    for (const p of efectivoData?.profesoras ?? []) {
      mapa.set(p.id_profesora, `${p.nombre} ${p.apellido}`.trim());
    }
    for (const r of historialData?.datos ?? []) {
      mapa.set(r.profesora.id_profesora, `${r.profesora.nombre} ${r.profesora.apellido}`.trim());
    }
    return Array.from(mapa.entries()).map(([id, nombre]) => ({ id: String(id), nombre }));
  }, [efectivoData, historialData]);

  // Cobros pendientes filtrados
  const cobrosFiltrados = useMemo(() => {
    const lista = efectivoData?.cobros ?? [];
    return lista.filter((cobro) => {
      if (filtroProfesora !== "TODAS" && String(cobro.profesora.id_profesora) !== filtroProfesora) {
        return false;
      }
      if (busqueda.trim()) {
        const query = normalizarParaBuscar(busqueda);
        const nombreProf = normalizarParaBuscar(`${cobro.profesora.nombre} ${cobro.profesora.apellido}`);
        const nombreAl = normalizarParaBuscar(`${cobro.alumno.nombre} ${cobro.alumno.apellido}`);
        const dni = cobro.alumno.dni ?? "";
        if (!nombreProf.includes(query) && !nombreAl.includes(query) && !dni.includes(busqueda.trim())) {
          return false;
        }
      }
      return true;
    });
  }, [efectivoData, busqueda, filtroProfesora]);

  // Historial filtrado
  const historialFiltrado = useMemo(() => {
    const lista = historialData?.datos ?? [];
    return lista.filter((r) => {
      if (filtroProfesora !== "TODAS" && String(r.profesora.id_profesora) !== filtroProfesora) {
        return false;
      }
      if (busqueda.trim()) {
        const query = normalizarParaBuscar(busqueda);
        const nombreProf = normalizarParaBuscar(`${r.profesora.nombre} ${r.profesora.apellido}`);
        const nombreAl = normalizarParaBuscar(`${r.alumno.nombre} ${r.alumno.apellido}`);
        if (!nombreProf.includes(query) && !nombreAl.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [historialData, busqueda, filtroProfesora]);

  const hayFiltrosActivos = busqueda.trim() !== "" || filtroProfesora !== "TODAS";
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroProfesora("TODAS");
  };

  const handleRendirCobro = async (cobro: CobroSinRendir) => {
    await rendirCobro.mutateAsync(
      {
        idPago: cobro.id_pago,
        observaciones: undefined,
      },
      {
        onSuccess: (res) => {
          toast.success("Cobro rendido exitosamente", {
            description: `Se rindieron ${formatearPrecio(res.total)} en caja.`,
          });
        },
        onError: () => {
          toast.error("No se pudo registrar la rendición");
        },
      }
    );
  };

  const cantidadPendiente = efectivoData?.cantidad ?? 0;
  const cantidadHistorial = historialData?.total ?? historialFiltrado.length;

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda y filtros en píldoras */}
      <section aria-label="Filtros de efectivo a rendir" className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Buscador */}
          <div className="relative flex-1 min-w-[280px] max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              id="buscar-rendicion"
              aria-label="Buscar por profesor/a o alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por profesor/a o alumno..."
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

          {/* Select Profesora en píldora */}
          <div className={cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !mostrarFiltrosMobile && "hidden xl:flex")}>
            <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
              <label htmlFor="filtro-profesora-rendicion" className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Profesora
              </label>
              <select
                id="filtro-profesora-rendicion"
                aria-label="Profesora"
                value={filtroProfesora}
                onChange={(e) => setFiltroProfesora(e.target.value)}
                className="appearance-none bg-white pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="TODAS">Todas</option>
                {opcionesProfesoras.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 size-4 text-slate-400" />
            </div>

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
        </div>
      </section>

      {/* Pestañas de estado para mobile */}
      <div className="flex lg:hidden items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setVista("PENDIENTES")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
            vista === "PENDIENTES"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
          )}
        >
          <span>Pendientes</span>
          <span className={cn(vista === "PENDIENTES" ? "text-primary font-black" : "text-slate-500")}>
            {cantidadPendiente}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setVista("HISTORIAL")}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
            vista === "HISTORIAL"
              ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
          )}
        >
          <span>Historial</span>
          <span className={cn(vista === "HISTORIAL" ? "text-primary font-black" : "text-slate-500")}>
            {cantidadHistorial}
          </span>
        </button>
      </div>

      {/* Tarjeta unificada de tabla con pestañas integradas en desktop */}
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        {/* Header de pestañas para desktop dentro de la tarjeta */}
        <div className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <button
            type="button"
            aria-label="Pendientes"
            onClick={() => setVista("PENDIENTES")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
              vista === "PENDIENTES"
                ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
            )}
          >
            <span>Pendientes</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-extrabold",
                vista === "PENDIENTES"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
              )}
            >
              {cantidadPendiente}
            </span>
          </button>

          <button
            type="button"
            aria-label="Historial rendido"
            onClick={() => setVista("HISTORIAL")}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
              vista === "HISTORIAL"
                ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
            )}
          >
            <span>Historial rendido</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-extrabold",
                vista === "HISTORIAL"
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
              )}
            >
              {cantidadHistorial}
            </span>
          </button>
        </div>

        {/* Contenido según vista */}
        {vista === "PENDIENTES" ? (
          cargandoPendientes ? (
            <TablaSkeleton conTarjeta={false} ariaLabel="Cargando efectivo pendiente" filas={4} />
          ) : errorPendientes ? (
            <div className="p-4">
              <EstadoErrorCarga
                mensaje="No se pudo cargar el efectivo pendiente de rendición."
                onReintentar={() => void recargarPendientes()}
              />
            </div>
          ) : cobrosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {hayFiltrosActivos
                  ? "No se encontraron coincidencias"
                  : "Todo el efectivo está rendido"}
              </h3>
              <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
                {hayFiltrosActivos
                  ? "Probá ajustando el término de búsqueda o el filtro de profesora."
                  : "No hay cobros en efectivo en mano de las profesoras pendientes de entrega."}
              </p>
              {hayFiltrosActivos && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={limpiarFiltros}
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
                        Fecha cobro
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Sin rendir
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Monto
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {cobrosFiltrados.map((cobro) => {
                      const nombreAlumno = `${cobro.alumno.nombre} ${cobro.alumno.apellido}`;
                      const nombreProfesora = `${cobro.profesora.nombre} ${cobro.profesora.apellido}`;
                      const dias = cobro.dias_sin_rendir;
                      const textoSinRendir = dias === 0 ? "Hoy" : `Hace ${dias} d`;

                      return (
                        <tr
                          key={cobro.id_pago}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                                {inicialesDe(cobro.alumno.nombre, cobro.alumno.apellido)}
                              </span>
                              <Link
                                to={`/app/alumnos/${cobro.alumno.id_alumno}`}
                                className="font-bold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                              >
                                {nombreAlumno}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                            {cobro.plan}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {nombreProfesora}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {formatearFechaCorta(cobro.fecha_pago)}
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {textoSinRendir}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                            {formatearPrecio(cobro.monto)}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={procesando}
                              onClick={() => void handleRendirCobro(cobro)}
                              aria-label={`Rendir cobro de ${nombreAlumno}`}
                              className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                            >
                              Rendir
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
                {cobrosFiltrados.map((cobro) => {
                  const nombreAlumno = `${cobro.alumno.nombre} ${cobro.alumno.apellido}`;
                  const nombreProfesora = `${cobro.profesora.nombre} ${cobro.profesora.apellido}`;
                  const dias = cobro.dias_sin_rendir;
                  const textoSinRendir = dias === 0 ? "Hoy" : `Hace ${dias} d`;

                  return (
                    <div
                      key={cobro.id_pago}
                      className="flex items-center justify-between gap-3 px-4 py-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                          {inicialesDe(cobro.alumno.nombre, cobro.alumno.apellido)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <Link
                            to={`/app/alumnos/${cobro.alumno.id_alumno}`}
                            className="text-sm font-bold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300 truncate block"
                          >
                            {nombreAlumno}
                          </Link>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            {cobro.plan} · {nombreProfesora} · {formatearFechaCorta(cobro.fecha_pago)} · {textoSinRendir} · {formatearPrecio(cobro.monto)}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={procesando}
                        onClick={() => void handleRendirCobro(cobro)}
                        aria-label={`Rendir cobro de ${nombreAlumno}`}
                        className="h-8 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                      >
                        Rendir
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )
        ) : errorHistorial ? (
          <div className="p-4">
            <EstadoErrorCarga
              mensaje="No se pudo cargar el historial de rendiciones."
              onReintentar={() => void recargarHistorial()}
            />
          </div>
        ) : (
          <TablaHistorialRendiciones
            rendiciones={historialFiltrado}
            cargando={cargandoHistorial}
          />
        )}
      </div>
    </div>
  );
}
