import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

// Detalle con forma de ticket: etiqueta a la izquierda, valor a la derecha, filas separadas por una
// línea punteada y el total al final. Lo usan el comprobante, los resúmenes antes de cobrar y el
// detalle de honorarios, para que todo lo que muestra plata se lea igual.

export function ListaDeDetalle({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("text-sm", className)}>{children}</dl>;
}

export function FilaDeDetalle({ etiqueta, children }: { etiqueta: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-slate-200 py-1.5 last:border-b-0 dark:border-slate-700">
      <dt className="shrink-0 text-slate-500 dark:text-slate-400">{etiqueta}</dt>
      <dd className="min-w-0 text-right font-medium break-words text-slate-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}

export function FilaDeTotal({ etiqueta, children }: { etiqueta: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 pt-2.5">
      <dt className="font-semibold text-slate-900 dark:text-slate-100">{etiqueta}</dt>
      <dd className="text-base font-bold tabular-nums text-slate-900 dark:text-white">{children}</dd>
    </div>
  );
}
