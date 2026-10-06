import { Check, Eye, Lock, X } from "lucide-react";
import { cn } from "@/utils/cn";
import type { NivelAcceso } from "@/features/seguridad/utils/niveles";

interface NivelPillProps {
  nivel: NivelAcceso;
  bloqueado?: string | null;
  corto?: boolean;
  onCiclar?: () => void;
  etiqueta: string;
}

const ESTILOS: Record<NivelAcceso, { clases: string; texto: string; textoCorto: string; Icono: typeof Check }> = {
  0: {
    clases:
      "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30 dark:hover:bg-emerald-500/25",
    texto: "Puede ver y modificar",
    textoCorto: "Ver y modificar",
    Icono: Check,
  },
  1: {
    clases:
      "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/25",
    texto: "Solo puede ver",
    textoCorto: "Solo ver",
    Icono: Eye,
  },
  [2]: {
    clases:
      "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:border-white/10 dark:hover:bg-white/15",
    texto: "Sin acceso",
    textoCorto: "Sin acceso",
    Icono: X,
  },
};

// Celda tri-estado estilo Stitch. Click = cicla al siguiente nivel.
// Bloqueada = conserva el color del nivel (verde para acceso total), muestra
// candado y no es interactiva.
export function NivelPill({ nivel, bloqueado, corto, onCiclar, etiqueta }: NivelPillProps) {
  const { clases, texto, textoCorto, Icono } = ESTILOS[nivel];

  if (bloqueado) {
    return (
      <span
        title={bloqueado}
        aria-label={`${etiqueta}: ${texto} (bloqueado)`}
        aria-disabled="true"
        className={cn(
          "inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold opacity-80",
          clases,
        )}
      >
        <Lock aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <Icono aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        {corto ? textoCorto : texto}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onCiclar}
      title={`${etiqueta}: clic para cambiar`}
      aria-label={`${etiqueta}: ${texto}. Activar para cambiar de nivel`}
      className={cn(
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors lg:min-h-[32px]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        clases,
      )}
    >
      <Icono aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {corto ? textoCorto : texto}
    </button>
  );
}
