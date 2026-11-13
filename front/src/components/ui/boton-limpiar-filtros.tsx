import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export interface PropsBotonLimpiarFiltros {
  onLimpiar: () => void;
  hayFiltros?: boolean;
  texto?: string;
  className?: string;
}

/**
 * Botón estandarizado de "Limpiar filtros" con icono RotateCcw,
 * estilo outline y tipografía consistente en todo el sistema.
 */
export function BotonLimpiarFiltros({
  onLimpiar,
  hayFiltros = true,
  texto = "Limpiar filtros",
  className,
}: PropsBotonLimpiarFiltros) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onLimpiar}
      disabled={!hayFiltros}
      className={cn(
        "h-10 shrink-0 rounded-lg font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 gap-1.5",
        className,
      )}
    >
      <RotateCcw aria-hidden="true" className="size-4 shrink-0" />
      {texto}
    </Button>
  );
}

