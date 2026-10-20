import type { SituacionCuota } from "@/features/alumnos/schemas/alumno";
import { etiquetaCuota, tonoCuota, type TonoCuota } from "@/features/alumnos/utils/situacion-cuota";
import { cn } from "@/utils/cn";

const CONFIG_TONO: Record<TonoCuota, { badge: string; dot: string }> = {
  "al-dia": {
    badge: "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  "por-vencer": {
    badge: "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/40 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  vencida: {
    badge: "border-rose-200/60 bg-rose-50 text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/40 dark:text-rose-300",
    dot: "bg-rose-500",
  },
  "sin-pago": {
    badge: "border-slate-200 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
    dot: "bg-slate-400",
  },
};

interface Props {
  situacion: SituacionCuota | null;
  className?: string;
}

// US-10 y US-18: el estado de la cuota de la inscripción vigente con dot indicador y píldora redondeada.
export function BadgeSituacionCuota({ situacion, className }: Props) {
  if (!situacion) {
    return <span className={cn("text-xs text-slate-500 dark:text-slate-400", className)}>Sin plan vigente</span>;
  }

  const tono = tonoCuota(situacion.estado);
  const config = CONFIG_TONO[tono];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shadow-2xs",
        config.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full shrink-0", config.dot)} aria-hidden="true" />
      {etiquetaCuota(situacion.estado)}
    </span>
  );
}

