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
    clases: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    texto: "Puede ver y modificar",
    textoCorto: "Ver y modificar",
    Icono: Check,
  },
  1: {
    clases: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    texto: "Solo puede ver",
    textoCorto: "Solo ver",
    Icono: Eye,
  },
  [2]: {
    clases: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200",
    texto: "Sin acceso",
    textoCorto: "Sin acceso",
    Icono: X,
  },
};

// Celda tri-estado estilo Stitch. Click = cicla al siguiente nivel.
// Bloqueada = muestra el estado con candado, sin interacción.
export function NivelPill({ nivel, bloqueado, corto, onCiclar, etiqueta }: NivelPillProps) {
  const { clases, texto, textoCorto, Icono } = ESTILOS[nivel];

  if (bloqueado) {
    return (
      <span
        title={bloqueado}
        aria-label={`${etiqueta}: ${texto} (bloqueado)`}
        className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800"
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
        "inline-flex min-h-[44px] items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        clases,
      )}
    >
      <Icono aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
      {corto ? textoCorto : texto}
    </button>
  );
}
