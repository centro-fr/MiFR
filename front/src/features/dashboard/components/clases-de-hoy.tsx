import { useMemo } from "react";
import { mensajeDeErrorApi } from "@/api/errores";
import { EstadoErrorCarga } from "@/components/ui/estados-pantalla";
import { Skeleton } from "@/components/ui/skeleton";
import { useClasesAsistencia } from "@/features/asistencia/hooks/use-asistencia";
import { ERROR_EN_TARJETA, TarjetaDashboard } from "@/features/dashboard/components/tarjeta-dashboard";
import { clasesDeHoy, horaActualArgentina, type EstadoClaseHoy } from "@/features/dashboard/utils/dashboard";
import { useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { cn } from "@/utils/cn";

// Mismo formato que los demás estados (Alumnos - Listado, Honorarios): píldora con punto.
const ESTILO: Record<EstadoClaseHoy, { badge: string; dot: string }> = {
  Terminada: {
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  "En curso": {
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  Próxima: {
    badge: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  Cancelada: {
    badge: "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

export function BadgeEstadoClase({ estado }: { estado: EstadoClaseHoy }) {
  const { badge, dot } = ESTILO[estado];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        badge,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 shrink-0 rounded-full", dot)} />
      {estado}
    </span>
  );
}

/** Clases de hoy (US-20, US-24): a qué hora, quién la da y en qué está. */
export function ClasesDeHoy() {
  const clases = useClasesAsistencia();
  const profesoras = useProfesorasParaFiltro();

  const filas = useMemo(() => {
    const nombres = new Map((profesoras.data ?? []).map((p) => [Number(p.id), `${p.nombre} ${p.apellido}`]));
    return clasesDeHoy(clases.data ?? [], horaActualArgentina(), (id) => nombres.get(id) ?? "");
  }, [clases.data, profesoras.data]);

  return (
    <TarjetaDashboard id="titulo-clases-hoy" titulo="Clases de hoy" pie={{ texto: "Ver horarios", to: "/app/horarios" }}>
      {clases.isPending ? (
        <div aria-busy="true" aria-label="Cargando las clases de hoy" className="space-y-3 py-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ) : clases.isError ? (
        <EstadoErrorCarga
          className={ERROR_EN_TARJETA}
          mensaje={mensajeDeErrorApi(clases.error, "No se pudieron cargar las clases de hoy.")}
          reintentando={clases.isFetching}
          onReintentar={() => void clases.refetch()}
        />
      ) : filas.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">Hoy no hay clases.</p>
      ) : (
        <ol aria-label="Clases de hoy">
          {filas.map((clase) => (
            <li
              key={clase.id}
              className={cn(
                "flex items-center gap-3 border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800",
                clase.estado === "Terminada" && "opacity-70",
              )}
            >
              <span className="w-11 shrink-0 text-sm font-semibold tabular-nums text-slate-500 dark:text-slate-400">{clase.hora}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{clase.actividad}</p>
                {clase.profesora && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{clase.profesora}</p>}
              </div>
              <BadgeEstadoClase estado={clase.estado} />
            </li>
          ))}
        </ol>
      )}
    </TarjetaDashboard>
  );
}
