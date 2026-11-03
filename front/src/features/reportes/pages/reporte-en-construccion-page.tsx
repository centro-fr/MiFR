import { Construction } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import { PESTANAS_REPORTES } from "@/features/reportes/utils/pestanas-reportes";

// Pestañas de Reportes que todavía no tienen su informe implementado:
// se mantienen en el menú con tarjeta de estado vacío estándar.
export function ReporteEnConstruccionPage() {
  const { pathname } = useLocation();
  const pestana = PESTANAS_REPORTES.find(({ ruta }) => pathname.endsWith(`/${ruta}`));

  return (
    <PaginaReportes>
      <Card className="flex flex-col items-center gap-3 border-slate-200 dark:border-slate-800 px-5 py-14 text-center rounded-3xl shadow-xs">
        <span
          aria-hidden="true"
          className="flex size-14 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-pink-950/70 dark:text-pink-200"
        >
          <Construction className="size-7" />
        </span>
        <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
          {pestana?.etiqueta ?? "Este informe"}: en construcción
        </h2>
        <p className="max-w-md text-sm text-slate-600 dark:text-slate-400">
          Este informe todavía no está disponible. Próximamente vas a poder consultar las métricas correspondientes en este panel.
        </p>
      </Card>
    </PaginaReportes>
  );
}
