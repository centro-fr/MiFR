import { Skeleton } from "@/components/ui/skeleton";
import { TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { useEstadisticasPlanes } from "@/features/reportes/hooks/use-reportes";
import { cn } from "@/utils/cn";

const SIN_FILTROS = { idActividad: null, idProfesora: null } as const;
const MAXIMO = 6;

/** Planes más elegidos (US-36): alumnos activos por plan, con una barra relativa al primero. */
export function PlanesElegidos() {
  const consulta = useEstadisticasPlanes(SIN_FILTROS);
  const planes = (consulta.data?.planes ?? []).filter((plan) => plan.alumnos > 0).slice(0, MAXIMO);
  const mayor = planes[0]?.alumnos ?? 1;

  return (
    <TarjetaDashboard
      id="titulo-planes-elegidos"
      titulo="Planes más elegidos"
      pie={{ texto: "Ver reporte", to: "/app/reportes/planes" }}
      resumen={
        consulta.data && (
          <>
            Total: <strong className="text-slate-900 dark:text-white">{consulta.data.alumnosActivos} activos</strong>
          </>
        )
      }
    >
      {consulta.isPending ? (
        <div aria-busy="true" aria-label="Cargando los planes más elegidos" className="space-y-3 py-3">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      ) : planes.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Todavía no hay alumnos activos.</p>
      ) : (
        <ol aria-label="Planes más elegidos">
          {planes.map((plan, indice) => (
            <li key={plan.id} className="flex flex-col gap-1.5 border-b border-slate-100 py-2.5 last:border-b-0 dark:border-slate-800">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="w-4 text-xs font-semibold text-slate-500 dark:text-slate-400">{indice + 1}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-slate-900 dark:text-white">{plan.nombre}</span>
                <span className="font-bold tabular-nums text-slate-900 dark:text-white">{plan.alumnos}</span>
                <span className="w-10 text-right text-xs tabular-nums text-slate-500 dark:text-slate-400">{Math.round(plan.porcentaje)}%</span>
              </div>
              <div aria-hidden="true" className="ml-6 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                <div
                  className={cn("h-1.5 rounded-full", indice === 0 ? "bg-primary" : "bg-primary/60")}
                  style={{ width: `${Math.round((plan.alumnos / mayor) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </TarjetaDashboard>
  );
}
