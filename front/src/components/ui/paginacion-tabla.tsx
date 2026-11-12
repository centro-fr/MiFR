import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

export interface PaginacionTablaProps {
  pagina: number;
  total: number;
  tamanoPagina?: number;
  onCambiarPagina: (nuevaPagina: number) => void;
  etiquetaItems?: string;
  className?: string;
}

/** Paginación estándar 10 a 10 con rango (ej. 1–10 de 25), Anterior, Siguiente y número de página. */
export function PaginacionTabla({
  pagina,
  total,
  tamanoPagina = 10,
  onCambiarPagina,
  etiquetaItems = "elementos",
  className,
}: PaginacionTablaProps) {
  // La paginación solo debe ser visible si hay más filas que el tamaño de página (10)
  if (total <= tamanoPagina) return null;

  const paginas = Math.max(1, Math.ceil(total / tamanoPagina));
  const paginaSegura = Math.min(Math.max(0, pagina), paginas - 1);
  const rangoInicio = total > 0 ? paginaSegura * tamanoPagina + 1 : 0;
  const rangoFin = Math.min((paginaSegura + 1) * tamanoPagina, total);

  return (
    <nav
      aria-label={`Paginación de ${etiquetaItems}`}
      className={cn(
        "mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs",
        className,
      )}
    >
      <p aria-live="polite" className="text-slate-500 dark:text-slate-400 font-medium">
        {rangoInicio}–{rangoFin} de {total} {etiquetaItems}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          disabled={paginaSegura === 0}
          onClick={() => onCambiarPagina(Math.max(0, paginaSegura - 1))}
          className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 size-3.5" />
          Anterior
        </Button>
        <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          {paginaSegura + 1} / {paginas}
        </span>
        <Button
          type="button"
          variant="outline"
          disabled={paginaSegura + 1 >= paginas}
          onClick={() => onCambiarPagina(Math.min(paginas - 1, paginaSegura + 1))}
          className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
        >
          Siguiente
          <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
        </Button>
      </div>
    </nav>
  );
}
