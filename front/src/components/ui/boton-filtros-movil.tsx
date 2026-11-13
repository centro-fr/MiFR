import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/utils/cn";

interface Props {
  abierto: boolean;
  /** Hay algún filtro aplicado: el botón se marca aunque el panel esté cerrado. */
  activos: boolean;
  onAlternar: () => void;
  /** id del contenedor de los filtros que muestra y oculta. */
  idPanel: string;
  /** Con texto ("Filtros") cuando no hay un buscador al lado que explique el ícono. */
  conTexto?: boolean;
}

/**
 * En el celular y la tablet los filtros de un listado quedan ocultos detrás de este botón, al lado del
 * buscador; en escritorio (xl) se ven siempre y el botón no aparece.
 */
export function BotonFiltrosMovil({ abierto, activos, onAlternar, idPanel, conTexto = false }: Props) {
  return (
    <button
      type="button"
      aria-label="Filtros"
      aria-expanded={abierto}
      aria-controls={idPanel}
      onClick={onAlternar}
      className={cn(
        "flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
        conTexto ? "w-fit px-3 text-sm font-semibold" : "w-10",
        (abierto || activos) && "border-primary text-primary",
      )}
    >
      <SlidersHorizontal aria-hidden="true" className="size-4" />
      {conTexto && <span aria-hidden="true">Filtros</span>}
    </button>
  );
}
