import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Tag } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FiltrosPlanesBar } from "@/features/planes/components/filtros-planes";
import { ListaPlanes, ListaPlanesCargando } from "@/features/planes/components/lista-planes";
import { ActualizarPrecioDialog, HistorialPreciosDialog } from "@/features/planes/components/precios-plan-dialogs";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import {
  FILTROS_INICIALES,
  actividadesDeLosPlanes,
  estaVigente,
  filtrarPlanes,
  hayFiltrosActivos,
  type FiltrosPlanes,
} from "@/features/planes/utils/planes";
import type { Plan } from "@/types/plan";

function Encabezado({ vigentes }: { vigentes?: number }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl xl:text-3xl font-black text-dark dark:text-white tracking-tight">
            Planes y Precios
          </h1>
          {vigentes !== undefined && (
            <Badge
              variant="outline"
              className="rounded-full border-pink-200 bg-pink-100 px-3 py-1 text-sm font-extrabold text-primary-dark dark:border-primary/40 dark:bg-primary/20 dark:text-pink-300 shadow-2xs"
            >
              {vigentes} {vigentes === 1 ? "vigente" : "vigentes"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
          La oferta comercial del centro: frecuencia, actividad y precio de cada plan.
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
    </header>
  );
}

function EstadoVacio({ titulo, detalle, accion }: { titulo: string; detalle: string; accion?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-14 text-center dark:border-slate-600">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200">
        <Tag aria-hidden="true" className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-extrabold text-[#181C26] dark:text-white">{titulo}</h2>
      <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">{detalle}</p>
      {accion}
    </Card>
  );
}

function ContenidoPlanes() {
  const { data: planes, isPending, isError, error, refetch } = usePlanes();
  const [filtros, setFiltros] = useState<FiltrosPlanes>(FILTROS_INICIALES);
  const [planPrecio, setPlanPrecio] = useState<Plan | null>(null);
  const [planHistorial, setPlanHistorial] = useState<Plan | null>(null);
  const visibles = useMemo(() => filtrarPlanes(planes ?? [], filtros), [planes, filtros]);
  const actividades = useMemo(() => actividadesDeLosPlanes(planes ?? []), [planes]);

  if (isPending) return <ListaPlanesCargando />;

  if (isError) {
    return (
      <Card className="flex flex-col items-center gap-3 border-slate-200 px-5 py-12 text-center dark:border-slate-600">
        <AlertCircle aria-hidden="true" className="h-8 w-8 text-rose-600 dark:text-rose-300" />
        <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mensajeDeErrorApi(error, "No se pudieron cargar los planes.")}
        </p>
        <Button
          type="button"
          onClick={() => void refetch()}
          className="min-h-[44px] rounded-lg bg-primary text-white hover:bg-primary-dark"
        >
          Reintentar
        </Button>
      </Card>
    );
  }

  if (planes.length === 0) {
    return (
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
    );
  }

  return (
    <>
      <FiltrosPlanesBar filtros={filtros} actividades={actividades} onChange={(cambio) => setFiltros((actuales) => ({ ...actuales, ...cambio }))} />
      {visibles.length === 0 ? (
        <EstadoVacio
          titulo="No hay planes que coincidan"
          detalle="Probá con otros filtros."
          accion={
            hayFiltrosActivos(filtros) && (
              <Button type="button" variant="outline" onClick={() => setFiltros(FILTROS_INICIALES)} className="min-h-[44px] rounded-xl font-bold">
                Limpiar filtros
              </Button>
            )
          }
        />
      ) : (
        <ListaPlanes
          planes={visibles}
          total={planes.length}
          onActualizarPrecio={setPlanPrecio}
          onVerHistorial={setPlanHistorial}
        />
      )}
      <ActualizarPrecioDialog key={planPrecio?.id ?? "precio-cerrado"} plan={planPrecio} onClose={() => setPlanPrecio(null)} />
      <HistorialPreciosDialog key={planHistorial?.id ?? "historial-cerrado"} plan={planHistorial} onClose={() => setPlanHistorial(null)} />
    </>
  );
}

// US-11: la oferta comercial. La ve quien tiene PLANES_VER; crear y editar es de la propietaria.
export function PlanesPage() {
  const { data: planes } = usePlanes();
  return (
    <OwnerLayout>
      {/* Ancho máximo de la guía del front (1200-1280 px): las tarjetas no se estiran en pantallas grandes. */}
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Encabezado vigentes={planes?.filter(estaVigente).length} />
        <ContenidoPlanes />
      </div>
    </OwnerLayout>
  );
}
