import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Plus, Tag } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Can } from "@/components/guards/can";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CLASE_BOTON_PRIMARIO } from "@/features/planes/components/estilos";
import { FiltrosPlanesBar } from "@/features/planes/components/filtros-planes";
import { ListaPlanes } from "@/features/planes/components/lista-planes";
import { usePlanes } from "@/features/planes/hooks/use-planes";
import {
  FILTROS_INICIALES,
  actividadesDeLosPlanes,
  estaVigente,
  filtrarPlanes,
  hayFiltrosActivos,
  type FiltrosPlanes,
} from "@/features/planes/utils/planes";

function Encabezado({ vigentes }: { vigentes?: number }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden="true" className="hidden size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white sm:flex">
          <Tag className="size-5" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">Planes y Precios</h1>
            {vigentes !== undefined && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-sm font-bold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300">
                {vigentes === 1 ? "1 vigente" : `${vigentes} vigentes`}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">La oferta comercial del centro: frecuencia, actividad y precio de cada plan.</p>
        </div>
      </div>
      <Can permission="PLANES_EDITAR">
        <Link to="/app/planes/nuevo" className={CLASE_BOTON_PRIMARIO}>
          <Plus aria-hidden="true" className="size-4" />
          Nuevo plan
        </Link>
      </Can>
    </header>
  );
}

function ListaSkeleton() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Cargando planes…</span>
      <Skeleton className="h-36 rounded-2xl sm:h-24" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  );
}

function EstadoVacio({ titulo, detalle, accion }: { titulo: string; detalle: string; accion?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 px-4 py-14 text-center dark:border-white/15">
      <span aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-500/15 dark:text-pink-300">
        <Tag className="size-7" />
      </span>
      <h2 className="text-base font-extrabold text-slate-900 dark:text-white">{titulo}</h2>
      <p className="max-w-[340px] text-sm text-muted-foreground">{detalle}</p>
      {accion}
    </div>
  );
}

function ContenidoPlanes() {
  const { data: planes, isPending, isError, error, refetch } = usePlanes();
  const [filtros, setFiltros] = useState<FiltrosPlanes>(FILTROS_INICIALES);
  const visibles = useMemo(() => filtrarPlanes(planes ?? [], filtros), [planes, filtros]);
  const actividades = useMemo(() => actividadesDeLosPlanes(planes ?? []), [planes]);

  if (isPending) return <ListaSkeleton />;
  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p role="alert" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {mensajeDeErrorApi(error, "No se pudieron cargar los planes.")}
        </p>
        <Button type="button" onClick={() => void refetch()} className="min-h-[44px] rounded-xl px-5 font-bold">
          Reintentar
        </Button>
      </div>
    );
  }
  if (planes.length === 0) {
    return (
      <EstadoVacio
        titulo="Todavía no hay planes"
        detalle="Creá el primero para empezar a inscribir alumnos."
        accion={
          <Can permission="PLANES_EDITAR">
            <Link to="/app/planes/nuevo" className={CLASE_BOTON_PRIMARIO}>
              <Plus aria-hidden="true" className="size-4" />
              Nuevo plan
            </Link>
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
        <ListaPlanes planes={visibles} total={planes.length} />
      )}
    </>
  );
}

// US-11: la oferta comercial. La ve quien tiene PLANES_VER; crear y editar es de la propietaria.
export function PlanesPage() {
  const { data: planes } = usePlanes();
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4 md:gap-5">
        <Encabezado vigentes={planes?.filter(estaVigente).length} />
        <ContenidoPlanes />
      </div>
    </OwnerLayout>
  );
}
