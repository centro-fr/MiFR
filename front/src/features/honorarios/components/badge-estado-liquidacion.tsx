import { ETIQUETA_ESTADO } from "@/features/honorarios/utils/formato-honorarios";
import type { EstadoLiquidacion } from "@/types/honorarios";
import { cn } from "@/utils/cn";

// Mismo formato que los estados de Alumnos - Listado (píldora con punto). En curso en gris (todavía
// cambia), para abonar en ámbar (falta hacer algo) y abonada en verde.
const ESTILO: Record<EstadoLiquidacion, { badge: string; dot: string }> = {
  BORRADOR: {
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
  CERRADA: {
    badge: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  PAGADA: {
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
};

export function BadgeEstadoLiquidacion({ estado, className }: { estado: EstadoLiquidacion; className?: string }) {
  const { badge, dot } = ESTILO[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        badge,
        className,
      )}
    >
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
