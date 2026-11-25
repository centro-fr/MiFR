import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { LISTA_MOVIL_EN_TARJETA } from "@/components/ui/estilos-lista";
import { FilaMovil } from "@/components/ui/fila-movil";
import { ConfirmarAccion } from "@/components/ui/confirmar-accion";
import { BotonFiltrosMovil } from "@/components/ui/boton-filtros-movil";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TablaSkeleton, EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { BotonLimpiarFiltros } from "@/components/ui/boton-limpiar-filtros";
import { inicialesDe } from "@/features/alumnos/utils/formato-ficha";
import { useProfesoras } from "@/features/profesoras/hooks/use-profesoras";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";
import { normalizarParaBuscar } from "@/utils/texto";
import {
  useEfectivoPendiente,
  useHistorialRendiciones,
  useRendirLote,
} from "../hooks/use-rendiciones";
import type { TotalDeProfesora } from "../schemas/rendicion";
import { TablaHistorialRendiciones } from "./tabla-historial-rendiciones";

type VistaRendicion = "PENDIENTES" | "HISTORIAL";

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
  const { data: listaProfesoras } = useProfesoras();

  // Mutations
  const rendirLote = useRendirLote();
  const procesando = rendirLote.isPending;

  // Set de IDs de profesoras activas
  const profesorasActivasSet = useMemo(() => {
    if (!listaProfesoras) return null;
    return new Set(listaProfesoras.filter((p) => p.activa).map((p) => p.id));
  }, [listaProfesoras]);

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

  // Profesoras con cobros pendientes filtradas
  const profesorasFiltradas = useMemo(() => {
    const todasLasProfesoras = efectivoData?.profesoras ?? [];
    const todosLosCobros = efectivoData?.cobros ?? [];

    // Considerar únicamente profesoras activas si la lista ya está disponible
    const activas = profesorasActivasSet
      ? todasLasProfesoras.filter((p) => profesorasActivasSet.has(p.id_profesora))
      : todasLasProfesoras;

    return activas.filter((prof) => {
      if (filtroProfesora !== "TODAS" && String(prof.id_profesora) !== filtroProfesora) {
        return false;
      }
      if (busqueda.trim()) {
        const query = normalizarParaBuscar(busqueda);
        const nombreProf = normalizarParaBuscar(`${prof.nombre} ${prof.apellido}`);
        if (nombreProf.includes(query)) return true;

        // Si algún alumno cobrado por la profesora coincide con la búsqueda
        const cobrosProf = todosLosCobros.filter((c) => c.profesora.id_profesora === prof.id_profesora);
        return cobrosProf.some((c) => {
          const nombreAl = normalizarParaBuscar(`${c.alumno.nombre} ${c.alumno.apellido}`);
          const dni = c.alumno.dni ?? "";
          return nombreAl.includes(query) || dni.includes(busqueda.trim());
        });
      }
      return true;
    });
  }, [efectivoData, profesorasActivasSet, filtroProfesora, busqueda]);

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

  // Estado de confirmación de rendición de la profesora
  const [profesoraARendir, setProfesoraARendir] = useState<TotalDeProfesora | null>(null);

  const handleRendirLote = async (profesora: TotalDeProfesora) => {
    await rendirLote.mutateAsync(
      {
        id_profesora: profesora.id_profesora,
        observaciones: undefined,
      },
      {
        onSuccess: (res) => {
          setProfesoraARendir(null);
          toast.success("Rendición registrada exitosamente", {
            description: `Se rindió el efectivo de ${profesora.nombre} ${profesora.apellido} (${formatearPrecio(
              res.total
            )}) en caja.`,
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
          <BotonFiltrosMovil
            abierto={mostrarFiltrosMobile}
            activos={hayFiltrosActivos}
            onAlternar={() => setMostrarFiltrosMobile((v) => !v)}
            idPanel="filtros-del-listado"
          />

          {/* Select Profesora en píldora */}
          <div id="filtros-del-listado" className={cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !mostrarFiltrosMobile && "hidden xl:flex")}>
            <SelectorDesplegable
              id="filtro-profesora-rendicion"
              etiqueta="Profesora"
              aria-label="Profesora"
              valor={filtroProfesora}
              opciones={[
                { valor: "TODAS", texto: "Todas" },
                ...opcionesProfesoras.map((p) => ({ valor: p.id, texto: p.nombre })),
              ]}
              onChange={setFiltroProfesora}
              variante="pildora"
            />

            {hayFiltrosActivos && (
              <BotonLimpiarFiltros onLimpiar={limpiarFiltros} />
            )}
          </div>
        </div>
      </section>

      {/* Pestañas de estado para mobile */}
      <PestanasFiltro
        className="lg:hidden"
        etiqueta="Efectivo pendiente o rendido"
        opciones={[
          { id: "PENDIENTES", etiqueta: "Pendientes", conteo: cantidadPendiente },
          { id: "HISTORIAL", etiqueta: "Historial", conteo: cantidadHistorial },
        ]}
        valor={vista}
        onCambiar={setVista}
      />

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
          ) : profesorasFiltradas.length === 0 ? (
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
                <BotonLimpiarFiltros onLimpiar={limpiarFiltros} className="mt-2" />
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table: Solo muestra por profesor la cantidad de cobros, total a rendir y acciones */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-100 bg-white text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <tr>
                      <th scope="col" className="px-6 py-3.5">
                        Profesor/a
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Cobros a rendir
                      </th>
                      <th scope="col" className="px-4 py-3.5">
                        Total a rendir
                      </th>
                      <th scope="col" className="px-6 py-3.5 text-right">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {profesorasFiltradas.map((prof) => {
                      const nombreProf = `${prof.nombre} ${prof.apellido}`.trim() || "Profesor/a";

                      return (
                        <tr
                          key={prof.id_profesora}
                          className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                        >
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-primary dark:bg-pink-950/60 dark:text-pink-300">
                                {inicialesDe(prof.nombre, prof.apellido)}
                              </span>
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {nombreProf}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-slate-600 dark:text-slate-300">
                            {prof.cantidad === 1 ? "1 cobro" : `${prof.cantidad} cobros`}
                          </td>
                          <td className="px-4 py-3.5 font-extrabold text-base text-slate-900 dark:text-white">
                            {formatearPrecio(prof.total)}
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <Button
                              type="button"
                              disabled={procesando}
                              onClick={() => setProfesoraARendir(prof)}
                              aria-label={`Rendir todo el efectivo de ${nombreProf}`}
                              className="h-8 min-h-0 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-2xs hover:bg-primary-dark"
                            >
                              Rendir todo
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Rows: Lista por profesor con su total y acción */}
              <ul aria-label="Efectivo a rendir" className={cn(LISTA_MOVIL_EN_TARJETA, "lg:hidden")}>
                {profesorasFiltradas.map((prof) => {
                  const nombreProf = `${prof.nombre} ${prof.apellido}`.trim() || "Profesor/a";

                  return (
                    <FilaMovil
                      key={prof.id_profesora}
                      avatar={nombreProf}
                      titulo={
                        <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {nombreProf}
                        </span>
                      }
                      detalle={[
                        prof.cantidad === 1 ? "1 cobro a rendir" : `${prof.cantidad} cobros a rendir`,
                        formatearPrecio(prof.total),
                      ]}
                      acciones={
                        <Button
                          type="button"
                          disabled={procesando}
                          onClick={() => setProfesoraARendir(prof)}
                          aria-label={`Rendir todo el efectivo de ${nombreProf}`}
                          className="h-8 min-h-0 shrink-0 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-2xs hover:bg-primary-dark"
                        >
                          Rendir todo
                        </Button>
                      }
                    />
                  );
                })}
              </ul>
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

      {/* Confirmar rendición de la profesora */}
      {profesoraARendir && (
        <ConfirmarAccion
          titulo={`¿Rendir todo el efectivo de ${profesoraARendir.nombre} ${profesoraARendir.apellido}?`}
          descripcion={`Se rendirán ${formatearPrecio(profesoraARendir.total)} en caja correspondientes a los ${profesoraARendir.cantidad} cobro(s) en mano de ${profesoraARendir.nombre} ${profesoraARendir.apellido}.`}
          textoConfirmar="Rendir todo"
          textoConfirmando="Rindiendo…"
          confirmando={procesando}
          peligro={false}
          onConfirmar={() => void handleRendirLote(profesoraARendir)}
          onCancelar={() => setProfesoraARendir(null)}
        />
      )}
    </div>
  );
}
