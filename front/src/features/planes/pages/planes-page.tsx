import { useMemo, useState, type ReactNode } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { CrearPlanDialog } from "@/features/planes/components/crear-plan-dialog";
import { EditarPlanDialog } from "@/features/planes/components/editar-plan-dialog";
import { ListaPlanes, ListaPlanesCargando } from "@/features/planes/components/lista-planes";
import { ActualizarPrecioDialog, HistorialPreciosDialog } from "@/features/planes/components/precios-plan-dialogs";
import { usePlanes, useReactivarPlan } from "@/features/planes/hooks/use-planes";
import { estaVigente } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { PromocionesPanel } from "@/features/promociones/components/promociones-panel";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { normalizarParaBuscar } from "@/utils/texto";

type PestanaEstadoPlan = "VIGENTES" | "BAJAS";

function Encabezado({ onNuevoPlan }: { onNuevoPlan: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Planes
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
          Lo que se le ofrece a cada alumno, cuánto cuesta y las promociones del momento.
        </p>
      </div>
      <Can permission="PLANES_EDITAR">
        <Button
          type="button"
          onClick={onNuevoPlan}
          className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
        >
          + Nuevo plan
        </Button>
      </Can>
    </div>
  );
}

function EstadoVacio({ titulo, detalle, accion }: { titulo: string; detalle: string; accion?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-800 rounded-lg">
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      {accion}
    </Card>
  );
}

// US-11: Catálogo de planes y promociones comerciales
export function PlanesPage() {
  const { pathname } = useLocation();
  const enPromociones = pathname.endsWith("/promociones");
  const { data: planes, isPending, isError, error, refetch } = usePlanes();
  const reactivarMutation = useReactivarPlan();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busqueda, setBusqueda] = useState("");
  const [pestanaEstado, setPestanaEstado] = useState<PestanaEstadoPlan>("VIGENTES");
  const [planNuevo, setPlanNuevo] = useState(() => searchParams.get("nuevo") === "1");
  const [planPrecio, setPlanPrecio] = useState<Plan | null>(null);
  const [planHistorial, setPlanHistorial] = useState<Plan | null>(null);
  const [planEdicion, setPlanEdicion] = useState<Plan | null>(null);

  const cerrarModalNuevo = () => {
    setPlanNuevo(false);
    if (searchParams.has("nuevo")) {
      setSearchParams({}, { replace: true });
    }
  };

  const handleReactivarPlan = (plan: Plan) => {
    reactivarMutation.mutate(plan.id, {
      onSuccess: () => {
        toast.success(`"${plan.nombre}" fue reincorporado a los planes vigentes.`);
      },
      onError: (err) => {
        toast.error(mensajeDeErrorApi(err, "No se pudo reincorporar el plan."));
      },
    });
  };

  const todosLosPlanes = useMemo(() => planes ?? [], [planes]);
  const planesVigentes = useMemo(() => todosLosPlanes.filter(estaVigente), [todosLosPlanes]);
  const planesBaja = useMemo(() => todosLosPlanes.filter((p) => !estaVigente(p)), [todosLosPlanes]);

  const planesFiltrados = useMemo(() => {
    const base = pestanaEstado === "VIGENTES" ? planesVigentes : planesBaja;
    const q = normalizarParaBuscar(busqueda);
    if (!q) return base;
    return base.filter((plan) =>
      [plan.nombre, plan.actividad?.nombre ?? ""].some((v) => normalizarParaBuscar(v).includes(q)),
    );
  }, [planesVigentes, planesBaja, pestanaEstado, busqueda]);

  const hayFiltros = busqueda.trim().length > 0;

  const cabeceraPestanasDesktop = (
    <div className="hidden lg:flex items-center gap-2 p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setPestanaEstado("VIGENTES")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestanaEstado === "VIGENTES"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Vigentes</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestanaEstado === "VIGENTES"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {planesVigentes.length}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPestanaEstado("BAJAS")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs",
          pestanaEstado === "BAJAS"
            ? "bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800",
        )}
      >
        <span>Dados de baja</span>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-extrabold",
            pestanaEstado === "BAJAS"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {planesBaja.length}
        </span>
      </button>
    </div>
  );

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        {enPromociones ? (
          <PromocionesPanel planes={planesVigentes} />
        ) : (
          <>
            <Encabezado onNuevoPlan={() => setPlanNuevo(true)} />

            {/* Barra de búsqueda como en Alumnos - Listado */}
            <section aria-label="Filtros de planes" className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[280px] max-w-sm">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                  />
                  <Input
                    type="search"
                    aria-label="Buscar por nombre o actividad"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre o actividad..."
                    className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
                  />
                </div>
                {hayFiltros && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setBusqueda("");
                    }}
                    className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark"
                  >
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </section>

            {/* Pestañas de estado para mobile */}
            <div className="flex lg:hidden items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPestanaEstado("VIGENTES")}
                className={cn(
                  "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
                  pestanaEstado === "VIGENTES"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                )}
              >
                Vigentes{" "}
                <span className={cn(pestanaEstado === "VIGENTES" ? "text-primary font-black" : "text-slate-500")}>
                  {planesVigentes.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setPestanaEstado("BAJAS")}
                className={cn(
                  "flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all",
                  pestanaEstado === "BAJAS"
                    ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-900 dark:text-white"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400",
                )}
              >
                Dados de baja{" "}
                <span className={cn(pestanaEstado === "BAJAS" ? "text-primary font-black" : "text-slate-500")}>
                  {planesBaja.length}
                </span>
              </button>
            </div>

            {isPending ? (
              <ListaPlanesCargando />
            ) : isError ? (
              <EstadoErrorCarga
                mensaje={mensajeDeErrorApi(error, "No se pudieron cargar los planes.")}
                onReintentar={() => void refetch()}
              />
            ) : planesFiltrados.length === 0 ? (
              <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs dark:border-slate-700/80 dark:bg-slate-900">
                {cabeceraPestanasDesktop}
                <EstadoVacio
                  titulo={
                    hayFiltros
                      ? "Sin resultados para tu búsqueda"
                      : pestanaEstado === "BAJAS"
                        ? "No hay planes dados de baja"
                        : "Todavía no hay planes"
                  }
                  detalle={
                    hayFiltros
                      ? "Probá ajustando el término de búsqueda para encontrar planes."
                      : pestanaEstado === "BAJAS"
                        ? "Los planes que des de baja aparecerán acá por si necesitás reincorporarlos."
                        : "Creá el primero para empezar a inscribir alumnos."
                  }
                  accion={
                    !hayFiltros && pestanaEstado === "VIGENTES" ? (
                      <Can permission="PLANES_EDITAR">
                        <Button
                          type="button"
                          onClick={() => setPlanNuevo(true)}
                          className="mt-2 min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
                        >
                          + Nuevo plan
                        </Button>
                      </Can>
                    ) : undefined
                  }
                />
              </div>
            ) : (
              <ListaPlanes
                planes={planesFiltrados}
                total={planesFiltrados.length}
                cabecera={cabeceraPestanasDesktop}
                onActualizarPrecio={setPlanPrecio}
                onEditarPlan={setPlanEdicion}
                onVerHistorial={setPlanHistorial}
                onReactivarPlan={handleReactivarPlan}
                reactivandoPlan={reactivarMutation.isPending}
              />
            )}

            <CrearPlanDialog
              abierto={planNuevo}
              onClose={cerrarModalNuevo}
            />
            <ActualizarPrecioDialog
              key={planPrecio?.id ?? "precio-cerrado"}
              plan={planPrecio}
              onClose={() => setPlanPrecio(null)}
            />
            <HistorialPreciosDialog
              key={planHistorial?.id ?? "historial-cerrado"}
              plan={planHistorial}
              onClose={() => setPlanHistorial(null)}
            />
            <EditarPlanDialog
              key={planEdicion?.id ?? "edicion-cerrada"}
              plan={planEdicion}
              onClose={() => setPlanEdicion(null)}
            />
          </>
        )}
      </div>
    </OwnerLayout>
  );
}
