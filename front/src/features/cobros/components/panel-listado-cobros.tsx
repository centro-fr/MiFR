import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { apiClient } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { formatearFecha, inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { informeCobranzaApiSchema } from "@/features/reportes/schemas/informes-centro";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";

type FiltroFormaCobro = "TODOS" | "EFECTIVO" | "TRANSFERENCIA";

const PESTANAS_FORMA: { id: FiltroFormaCobro; etiqueta: string }[] = [
  { id: "TODOS", etiqueta: "Todos" },
  { id: "EFECTIVO", etiqueta: "Efectivo" },
  { id: "TRANSFERENCIA", etiqueta: "Transferencia" },
];

interface PanelListadoCobrosProps {
  onVerComprobante: (idPago: number) => void;
}

export function PanelListadoCobros({ onVerComprobante }: PanelListadoCobrosProps) {
  const { user } = useAuth();
  const nombrePropietaria =
    (user?.roles.includes("PROPIETARIA") && `${user.nombre} ${user.apellido}`.trim()) ||
    "Marina Sosa";

  const [busqueda, setBusqueda] = useState("");
  const [filtroProfesora, setFiltroProfesora] = useState<string>("TODAS");
  const [filtroForma, setFiltroForma] = useState<FiltroFormaCobro>("TODOS");
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);

  const hoy = fechaActualArgentina();
  const { data: cobranzaData, isLoading, isError, refetch } = useQuery({
    queryKey: ["cobros", "historial", hoy],
    queryFn: async () => {
      const respuesta = await apiClient.get("/reportes/cobranza", {
        params: { desde: "2025-01-01", hasta: hoy, limit: 100, offset: 0 },
      });
      return informeCobranzaApiSchema.parse(respuesta.data);
    },
  });

  const cobros = useMemo(() => cobranzaData?.datos ?? [], [cobranzaData]);

  const opcionesProfesoras = useMemo(() => {
    const nombres = new Set<string>();
    let huboCobroPropietaria = false;

    for (const c of cobros) {
      if (c.profesora_cobra) {
        nombres.add(`${c.profesora_cobra.nombre} ${c.profesora_cobra.apellido}`.trim());
      } else {
        huboCobroPropietaria = true;
      }
    }

    const lista = Array.from(nombres).sort((a, b) => a.localeCompare(b, "es"));
    // Agregar a la Propietaria en el filtro si hubo cobros registrados por ella o si la lista está disponible
    if (huboCobroPropietaria || cobros.length === 0) {
      lista.unshift(nombrePropietaria);
    }
    return lista;
  }, [cobros, nombrePropietaria]);

  const conteosPorForma: Record<FiltroFormaCobro, number> = useMemo(
    () => ({
      TODOS: cobros.length,
      EFECTIVO: cobros.filter((c) => c.forma_pago === "EFECTIVO").length,
      TRANSFERENCIA: cobros.filter((c) => c.forma_pago === "TRANSFERENCIA").length,
    }),
    [cobros],
  );

  const cobrosFiltrados = useMemo(() => {
    return cobros.filter((cobro) => {
      if (filtroForma !== "TODOS" && cobro.forma_pago !== filtroForma) {
        return false;
      }
      if (filtroProfesora !== "TODAS") {
        const nombreProf = cobro.profesora_cobra
          ? `${cobro.profesora_cobra.nombre} ${cobro.profesora_cobra.apellido}`.trim()
          : nombrePropietaria;
        if (nombreProf !== filtroProfesora) {
          return false;
        }
      }
      if (busqueda.trim()) {
        const q = normalizarParaBuscar(busqueda);
        const nombreAlumno = normalizarParaBuscar(`${cobro.alumno.nombre} ${cobro.alumno.apellido}`);
        const nombrePlan = normalizarParaBuscar(cobro.plan.nombre);
        if (!nombreAlumno.includes(q) && !nombrePlan.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [cobros, filtroForma, filtroProfesora, busqueda, nombrePropietaria]);

  const hayFiltrosActivos =
    busqueda.trim() !== "" || filtroProfesora !== "TODAS" || filtroForma !== "TODOS";

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroProfesora("TODAS");
    setFiltroForma("TODOS");
  };

  return (
    <div className="space-y-4">
      <section aria-label="Filtros de historial de cobros" className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[280px] max-w-sm">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
            />
            <Input
              id="buscar-cobros-historial"
              aria-label="Buscar por alumno o plan"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por alumno o plan..."
              autoComplete="off"
              className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
            />
          </div>

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

          <div
            className={cn(
              "flex flex-wrap items-center gap-2.5 w-full xl:w-auto",
              !mostrarFiltrosMobile && "hidden xl:flex",
            )}
          >
            <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
              <label
                htmlFor="filtro-profesora-cobros-historial"
                className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap"
              >
                Cobró
              </label>
              <select
                id="filtro-profesora-cobros-historial"
                aria-label="Cobró"
                value={filtroProfesora}
                onChange={(e) => setFiltroProfesora(e.target.value)}
                className="appearance-none bg-white pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:bg-slate-900 dark:text-slate-200"
              >
                <option value="TODAS">Cualquiera</option>
                {opcionesProfesoras.map((nombre) => (
                  <option key={nombre} value={nombre}>
                    {nombre}
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

      {/* Pestañas de forma de pago para mobile */}
      <div className="flex lg:hidden items-center gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
        {PESTANAS_FORMA.map((pestana) => {
          const activa = filtroForma === pestana.id;
          return (
            <button
              key={pestana.id}
              type="button"
              onClick={() => setFiltroForma(pestana.id)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-all",
                activa
                  ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
              )}
            >
              <span>{pestana.etiqueta}</span>
              <span className={cn(activa ? "text-primary font-black" : "text-slate-500")}>
                {conteosPorForma[pestana.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tarjeta unificada de tabla con pestañas integradas en desktop */}
      <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
        <div className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          {PESTANAS_FORMA.map((pestana) => {
            const activa = filtroForma === pestana.id;
            return (
              <button
                key={pestana.id}
                type="button"
                aria-label={pestana.etiqueta}
                onClick={() => setFiltroForma(pestana.id)}
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
                  {conteosPorForma[pestana.id]}
                </span>
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <TablaSkeleton conTarjeta={false} ariaLabel="Cargando cobros" filas={5} />
        ) : isError ? (
          <div className="p-4">
            <EstadoErrorCarga
              mensaje="No se pudo cargar el historial de cobros."
              onReintentar={() => void refetch()}
            />
          </div>
        ) : cobrosFiltrados.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-5 py-14 text-center">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {hayFiltrosActivos ? "No se encontraron coincidencias" : "No hay cobros registrados"}
            </h3>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
              {hayFiltrosActivos
                ? "Probá ajustando el término de búsqueda o los filtros seleccionados."
                : "Los cobros confirmados figurarán en este historial con su comprobante."}
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
                      Cobró
                    </th>
                    <th scope="col" className="px-4 py-3.5">
                      Fecha
                    </th>
                    {filtroForma === "TODOS" && (
                      <th scope="col" className="px-4 py-3.5">
                        Forma de pago
                      </th>
                    )}
                    <th scope="col" className="px-4 py-3.5">
                      Promoción
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
                    const nombreQuienCobro = cobro.profesora_cobra
                      ? `${cobro.profesora_cobra.nombre} ${cobro.profesora_cobra.apellido}`
                      : nombrePropietaria;
                    const textoForma = cobro.forma_pago === "EFECTIVO" ? "Efectivo" : "Transferencia";

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
                            {cobro.alumno.id_alumno ? (
                              <Link
                                to={`/app/alumnos/${cobro.alumno.id_alumno}`}
                                className="font-bold text-sm text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300"
                              >
                                {nombreAlumno}
                              </Link>
                            ) : (
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {nombreAlumno}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                          {cobro.plan.nombre}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                          {nombreQuienCobro}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                          {formatearFecha(cobro.fecha_pago)}
                        </td>
                        {filtroForma === "TODOS" && (
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {textoForma}
                          </td>
                        )}
                        <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                          {cobro.promocion ? (
                            cobro.promocion.nombre
                          ) : (
                            <span className="font-normal text-slate-400 dark:text-slate-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-white">
                          {formatearPrecio(cobro.monto)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => onVerComprobante(cobro.id_pago)}
                            aria-label={`Ver comprobante de ${nombreAlumno}`}
                            className="h-8 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                          >
                            Ver comprobante
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 lg:hidden dark:divide-slate-800">
              {cobrosFiltrados.map((cobro) => {
                const nombreAlumno = `${cobro.alumno.nombre} ${cobro.alumno.apellido}`;
                const nombreQuienCobro = cobro.profesora_cobra
                  ? `${cobro.profesora_cobra.nombre} ${cobro.profesora_cobra.apellido}`
                  : nombrePropietaria;
                const textoForma = cobro.forma_pago === "EFECTIVO" ? "Efectivo" : "Transferencia";

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
                        {cobro.alumno.id_alumno ? (
                          <Link
                            to={`/app/alumnos/${cobro.alumno.id_alumno}`}
                            className="text-sm font-bold text-slate-900 hover:text-primary transition-colors dark:text-white dark:hover:text-pink-300 truncate block"
                          >
                            {nombreAlumno}
                          </Link>
                        ) : (
                          <span className="text-sm font-bold text-slate-900 dark:text-white truncate block">
                            {nombreAlumno}
                          </span>
                        )}
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {cobro.plan.nombre} · {nombreQuienCobro} · {formatearFecha(cobro.fecha_pago)}
                          {filtroForma === "TODOS" ? ` · ${textoForma}` : ""}
                          {cobro.promocion ? ` · Promoción: ${cobro.promocion.nombre}` : ""}
                          {` · ${formatearPrecio(cobro.monto)}`}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onVerComprobante(cobro.id_pago)}
                      aria-label={`Ver comprobante de ${nombreAlumno}`}
                      className="h-8 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
                    >
                      Ver comprobante
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
