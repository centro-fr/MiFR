import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { PESTANAS_REPORTES } from "@/features/reportes/utils/pestanas-reportes";

// Pestañas de Reportes que todavía no tienen su informe (US-34, US-36, US-37, ranking y cobranza):
// quedan en el menú para que la estructura sea la del diseño y se reemplazan al implementarlas.
export function ReporteEnConstruccionPage() {
  const { pathname } = useLocation();
  const pestana = PESTANAS_REPORTES.find(({ ruta }) => pathname.endsWith(`/${ruta}`));
  return (
    <PaginaReportes>
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
        <Construction aria-hidden="true" className="size-8 text-slate-400" />
        <h2 className="font-bold text-slate-900 dark:text-white">{pestana?.etiqueta ?? "Este informe"}: en construcción</h2>
        <p className="max-w-sm text-sm text-slate-600 dark:text-slate-300">Este informe todavía no está disponible.</p>
      </div>
    </PaginaReportes>
  );
}
