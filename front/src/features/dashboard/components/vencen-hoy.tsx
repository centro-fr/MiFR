import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useListaCompletaAlumnos } from "@/features/alumnos/hooks/use-alumnos";
import { TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { cuotasQueVencenHoy } from "@/features/dashboard/utils/dashboard";
import { useEstadisticasPlanes } from "@/features/reportes/hooks/use-reportes";
import { fechaActualArgentina } from "@/utils/fecha";
import { formatearPrecio } from "@/utils/moneda";

const SIN_FILTROS_PLANES = { idActividad: null, idProfesora: null } as const;
const MAXIMO = 6;

/** Cuotas que vencen hoy (US-17/US-25): a quién recordarle que pague antes de la clase. */
export function VencenHoy() {
  const alumnos = useListaCompletaAlumnos();
  const planes = useEstadisticasPlanes(SIN_FILTROS_PLANES);
  const hoy = fechaActualArgentina();

  const cuotas = useMemo(() => {
    const precios = new Map((planes.data?.planes ?? []).flatMap((plan) => (plan.precioVigente === null ? [] : [[plan.nombre, plan.precioVigente] as const])));
    return cuotasQueVencenHoy(alumnos.data ?? [], hoy, precios);
  }, [alumnos.data, planes.data, hoy]);

  return (
    <TarjetaDashboard
      id="titulo-vencen-hoy"
      titulo="Vencen hoy"
      pie={{ texto: "Ver listado", to: "/app/alumnos/listado" }}
      resumen={cuotas.length > MAXIMO ? `${cuotas.length} cuotas` : undefined}
    >
      {alumnos.isPending ? (
        <div aria-busy="true" aria-label="Cargando las cuotas que vencen hoy" className="space-y-3 py-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : cuotas.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Hoy no vence ninguna cuota.</p>
      ) : (
        <ul aria-label="Cuotas que vencen hoy">
          {cuotas.slice(0, MAXIMO).map((cuota) => (
            <li key={cuota.idAlumno} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/app/alumnos/${cuota.idAlumno}`}
                  className="block truncate text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                >
                  {cuota.alumno}
                </Link>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{cuota.detalle}</p>
              </div>
              {cuota.monto !== null && (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{formatearPrecio(cuota.monto)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </TarjetaDashboard>
  );
}
