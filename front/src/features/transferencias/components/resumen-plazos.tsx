import { AlertTriangle, CircleCheck, Clock } from "lucide-react";
import { TRAMOS, type TramoPlazo } from "@/features/transferencias/utils/plazo-verificacion";
import { cn } from "@/utils/cn";

const TARJETAS: Record<TramoPlazo, { titulo: string; detalle: (n: number) => string; icono: typeof Clock; clases: string }> = {
  "a-tiempo": {
    titulo: "Menos de 12 h",
    detalle: (n) => `${n} a tiempo`,
    icono: CircleCheck,
    clases: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  "por-vencer": {
    titulo: "Entre 12 y 24 h",
    detalle: (n) => `${n} por vencer`,
    icono: Clock,
    clases: "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
  },
  vencida: {
    titulo: "24 h o más",
    detalle: (n) => (n === 1 ? "1 vencida" : `${n} vencidas`),
    icono: AlertTriangle,
    clases: "bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
  },
};

interface Props {
  cuenta: Record<TramoPlazo, number> | undefined;
  seleccionado: TramoPlazo | null;
  onSeleccionar: (tramo: TramoPlazo | null) => void;
}

/** US-17: cuántas pendientes hay en cada tramo del plazo. Cada tarjeta filtra la lista. */
export function ResumenPlazos({ cuenta, seleccionado, onSeleccionar }: Props) {
  return (
    <div role="group" aria-label="Pendientes según el tiempo desde la carga" className="grid grid-cols-3 gap-2 sm:gap-3">
      {TRAMOS.map((tramo) => {
        const { titulo, detalle, icono: Icono, clases } = TARJETAS[tramo];
        const cantidad = cuenta?.[tramo];
        const alerta = tramo === "vencida" && (cantidad ?? 0) > 0;
        return (
          <button
            key={tramo}
            type="button"
            aria-pressed={seleccionado === tramo}
            disabled={cuenta === undefined}
            onClick={() => onSeleccionar(seleccionado === tramo ? null : tramo)}
            className={cn(
              "flex min-h-[44px] flex-col items-start gap-2 rounded-2xl border border-border bg-white p-3 text-left shadow-sm transition-colors hover:border-slate-300 focus-visible:outline-2 focus-visible:outline-primary sm:flex-row sm:items-center sm:gap-3 sm:p-4 dark:bg-surface-low dark:hover:border-white/25",
              alerta && "border-rose-300 bg-rose-50/60 dark:border-rose-500/40 dark:bg-rose-500/10",
              seleccionado === tramo && "ring-2 ring-primary",
            )}
          >
            <span aria-hidden="true" className={cn("flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-10", clases)}>
              <Icono className="size-4 sm:size-5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">{titulo}</span>
              <span className={cn("text-sm font-extrabold text-slate-900 sm:text-lg dark:text-white", alerta && "text-rose-700 dark:text-rose-300")}>
                {cantidad === undefined ? "–" : detalle(cantidad)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
