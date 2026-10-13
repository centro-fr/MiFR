import { CircleCheck, CircleX, Clock } from "lucide-react";
import { etiquetaEstado } from "@/features/transferencias/utils/formato-transferencia";
import { etiquetaTramo, textoHoras, tramoDePlazo, type TramoPlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { EstadoTransferencia, Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";

// Son <span> y no <Badge> (un <div>): van dentro de los botones de la lista.

const BASE = "inline-flex min-h-7 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 text-sm font-bold";

// Colores de AGENTS.md (verde, amarillo, rojo). La vencida va en rojo lleno, sin parpadeo: la
// animación infinita del diseño se sacó por rendimiento (.agents/rules/performance.md).
const CLASES_TRAMO: Record<TramoPlazo, string> = {
  "a-tiempo": "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200",
  "por-vencer": "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200",
  vencida: "border-rose-700 bg-rose-700 text-white dark:border-rose-500 dark:bg-rose-600",
};

/** Horas desde la carga y su tramo: el texto acompaña al color, para no depender solo de él. */
export function EtiquetaPlazo({ transferencia, larga = false }: { transferencia: Transferencia; larga?: boolean }) {
  const tramo = tramoDePlazo(transferencia);
  const etiqueta = tramo === "vencida" && !larga ? "Vencida" : etiquetaTramo(tramo);
  return (
    <span className={cn(BASE, CLASES_TRAMO[tramo])}>
      <Clock aria-hidden="true" className="size-3.5" />
      {textoHoras(transferencia.horasDesdeLaCarga)} · {etiqueta}
    </span>
  );
}

const CLASES_ESTADO: Record<EstadoTransferencia, string> = {
  PENDIENTE: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-200",
  CONFIRMADO: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-200",
  RECHAZADO: "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-200",
};

const ICONO_ESTADO: Record<EstadoTransferencia, typeof Clock> = {
  PENDIENTE: Clock,
  CONFIRMADO: CircleCheck,
  RECHAZADO: CircleX,
};

export function EtiquetaEstado({ estado }: { estado: EstadoTransferencia }) {
  const Icono = ICONO_ESTADO[estado];
  return (
    <span className={cn(BASE, CLASES_ESTADO[estado])}>
      <Icono aria-hidden="true" className="size-3.5" />
      {etiquetaEstado(estado)}
    </span>
  );
}
