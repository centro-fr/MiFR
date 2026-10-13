import { Badge } from "@/components/ui/badge";
import type { SituacionCuota } from "@/features/alumnos/schemas/alumno";
import { etiquetaCuota, tonoCuota, type TonoCuota } from "@/features/alumnos/utils/situacion-cuota";
import { cn } from "@/utils/cn";

const CLASES_TONO: Record<TonoCuota, string> = {
  "al-dia":
    "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200",
  "por-vencer":
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200",
  vencida: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-200",
  "sin-pago": "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
};

interface Props {
  situacion: SituacionCuota | null;
  className?: string;
}

// US-10 y US-18: el estado de la cuota de la inscripción vigente. El texto siempre acompaña al
// color, para no depender solo de él.
export function BadgeSituacionCuota({ situacion, className }: Props) {
  if (!situacion) {
    return <span className={cn("text-sm text-slate-600 dark:text-slate-400", className)}>Sin plan vigente</span>;
  }
  return (
    <Badge variant="outline" className={cn("min-h-7 border px-2 text-sm", CLASES_TONO[tonoCuota(situacion.estado)], className)}>
      {etiquetaCuota(situacion.estado)}
    </Badge>
  );
}
