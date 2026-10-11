import type { ModalidadActividad } from "@/types/actividad";
import { cn } from "@/utils/cn";

// Colores de front/AGENTS.md: grupal azul, personalizada violeta; vigente verde, de baja gris.

const BASE = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-sm font-bold";

const MODALIDAD: Record<ModalidadActividad, { texto: string; clases: string }> = {
  GRUPAL: {
    texto: "Grupal",
    clases: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-300",
  },
  PERSONALIZADA: {
    texto: "Personalizada",
    clases: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300",
  },
};

/** Sin modalidad, el plan sirve para cualquier actividad. */
export function BadgeModalidad({ modalidad }: { modalidad: ModalidadActividad | null }) {
  if (!modalidad) {
    return (
      <span className={cn(BASE, "border-slate-200 bg-slate-50 text-slate-600 dark:border-white/15 dark:bg-white/5 dark:text-slate-300")}>
        Cualquier actividad
      </span>
    );
  }
  const { texto, clases } = MODALIDAD[modalidad];
  return <span className={cn(BASE, clases)}>{texto}</span>;
}

export function BadgeEstadoPlan({ vigente }: { vigente: boolean }) {
  return (
    <span
      className={cn(
        BASE,
        vigente
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300"
          : "border-slate-300 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/10 dark:text-slate-300",
      )}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {vigente ? "Vigente" : "De baja"}
    </span>
  );
}
