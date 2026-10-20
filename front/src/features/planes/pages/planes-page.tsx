import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Clock, Sparkles, Tag } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EditarPlanDialog } from "@/features/planes/components/editar-plan-dialog";
import { ListaPlanes, ListaPlanesCargando } from "@/features/planes/components/lista-planes";
import { ActualizarPrecioDialog, HistorialPreciosDialog } from "@/features/planes/components/precios-plan-dialogs";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import { estaVigente } from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";
import { cn } from "@/utils/cn";

type PestanaPlanes = "PLANES" | "PROMOCIONES";

function Breadcrumbs() {
  return (
    <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
      <Link to="/app" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
        Inicio
      </Link>
      <span>/</span>
      <span>Clases</span>
      <span>/</span>
      <span className="font-bold text-slate-800 dark:text-slate-200">Planes y Precios</span>
    </nav>
  );
}

function Encabezado({ cantidadPlanes }: { cantidadPlanes?: number }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Planes y Precios
          </h1>
          {cantidadPlanes !== undefined && (
            <span className="rounded-full bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 text-xs font-bold px-2.5 py-0.5">
              {cantidadPlanes} {cantidadPlanes === 1 ? "plan activo" : "planes activos"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
          Lo que se le ofrece a cada alumno, cuánto cuesta y las promociones del momento.
        </p>
      </div>
      <Can permission="PLANES_EDITAR">
        <Button
          asChild
          className="min-h-[44px] rounded-xl bg-primary px-4 md:px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95 shrink-0"
        >
          <Link to="/app/planes/nuevo">
            + Nuevo plan
          </Link>
        </Button>
      </Can>
    </div>
  );
}

function Pestanas({
  activa,
  onChange,
  cantidadPlanes,
}: {
  activa: PestanaPlanes;
  onChange: (tab: PestanaPlanes) => void;
  cantidadPlanes: number;
}) {
  return (
    <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 pt-1">
      <button
        type="button"
        onClick={() => onChange("PLANES")}
        className={cn(
          "flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative",
          activa === "PLANES"
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
        )}
      >
        <span>Planes</span>
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-black transition-colors",
            activa === "PLANES"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
          )}
        >
          {cantidadPlanes}
        </span>
        {activa === "PLANES" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </button>

      <button
        type="button"
        onClick={() => onChange("PROMOCIONES")}
        className={cn(
          "flex items-center gap-2 pb-3 text-sm font-bold transition-colors relative",
          activa === "PROMOCIONES"
            ? "text-slate-900 dark:text-white"
            : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
        )}
      >
        <span>Promociones</span>
        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full text-xs font-black transition-colors",
            activa === "PROMOCIONES"
              ? "bg-primary text-white"
              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
          )}
        >
          3
        </span>
        {activa === "PROMOCIONES" && (
          <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
        )}
      </button>
    </div>
  );
}

function PromocionesEnConstruccion() {
  return (
    <div className="flex flex-col items-center justify-center p-12 sm:p-16 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center max-w-xl mx-auto my-6">
      <div className="size-16 rounded-3xl bg-pink-50 dark:bg-primary/10 text-primary flex items-center justify-center mb-4 shadow-xs">
        <Sparkles className="size-8 text-primary" />
      </div>
      <Badge
        variant="outline"
        className="rounded-full border-pink-200 bg-pink-50 px-3 py-1 text-xs font-bold text-primary dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 mb-3"
      >
        En construcción
      </Badge>
      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
        Módulo de Promociones
      </h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        Estamos desarrollando el módulo para gestionar promociones por tiempo limitado, descuentos por grupo familiar y convenios especiales.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
        <Clock className="size-3.5" />
        <span>Próximamente disponible en MiFR</span>
      </div>
    </div>
  );
}

function EstadoVacio({ titulo, detalle, accion }: { titulo: string; detalle: string; accion?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-800 rounded-3xl">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <Tag aria-hidden="true" className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      {accion}
    </Card>
  );
}

// US-11: Catálogo de planes y promociones comerciales
export function PlanesPage() {
  const { data: planes, isPending, isError, error, refetch } = usePlanes();
  const [pestana, setPestana] = useState<PestanaPlanes>("PLANES");
  const [planPrecio, setPlanPrecio] = useState<Plan | null>(null);
  const [planHistorial, setPlanHistorial] = useState<Plan | null>(null);
  const [planEdicion, setPlanEdicion] = useState<Plan | null>(null);

  const planesVigentes = (planes ?? []).filter(estaVigente);

  return (
    <OwnerLayout>
      <div className="space-y-6 min-w-0">
        <Breadcrumbs />
        <Encabezado cantidadPlanes={isPending ? undefined : planesVigentes.length} />
        <Pestanas
          activa={pestana}
          onChange={setPestana}
          cantidadPlanes={planesVigentes.length}
        />

        {pestana === "PROMOCIONES" ? (
          <PromocionesEnConstruccion />
        ) : isPending ? (
          <ListaPlanesCargando />
        ) : isError ? (
          <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-800 rounded-3xl">
            <AlertCircle aria-hidden="true" className="h-8 w-8 text-rose-600 dark:text-rose-300" />
            <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {mensajeDeErrorApi(error, "No se pudieron cargar los planes.")}
            </p>
            <Button
              type="button"
              onClick={() => void refetch()}
              className="min-h-[44px] rounded-xl bg-primary text-white hover:bg-primary-dark font-bold"
            >
              Reintentar
            </Button>
          </Card>
        ) : planesVigentes.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay planes"
            detalle="Creá el primero para empezar a inscribir alumnos."
            accion={
              <Can permission="PLANES_EDITAR">
                <Button
                  asChild
                  className="mt-2 min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-lg shadow-primary/30 transition-transform hover:bg-primary-dark active:scale-95"
                >
                  <Link to="/app/planes/nuevo">
                    + Nuevo plan
                  </Link>
                </Button>
              </Can>
            }
          />
        ) : (
          <ListaPlanes
            planes={planesVigentes}
            total={planesVigentes.length}
            onActualizarPrecio={setPlanPrecio}
            onEditarPlan={setPlanEdicion}
            onVerHistorial={setPlanHistorial}
          />
        )}

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
      </div>
    </OwnerLayout>
  );
}
