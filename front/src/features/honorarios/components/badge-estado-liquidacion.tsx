import { Badge } from "@/components/ui/badge";
import { ETIQUETA_ESTADO } from "@/features/honorarios/utils/formato-honorarios";
import type { EstadoLiquidacion } from "@/types/honorarios";
import { cn } from "@/utils/cn";

// En curso en gris (todavía cambia), para abonar en ámbar (falta hacer algo) y abonada en verde.
const ESTILO: Record<EstadoLiquidacion, string> = {
  BORRADOR: "border-slate-200 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200",
  CERRADA: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200",
  PAGADA: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200",
};

export function BadgeEstadoLiquidacion({ estado, className }: { estado: EstadoLiquidacion; className?: string }) {
  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", ESTILO[estado], className)}>
      {ETIQUETA_ESTADO[estado]}
    </Badge>
  );
}
