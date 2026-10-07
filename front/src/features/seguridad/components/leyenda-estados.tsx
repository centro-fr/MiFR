import { Check, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Leyenda de los 3 estados resultantes (lenguaje Stitch): combinan los
// switches *_VER y *_EDITAR de cada módulo.
const ESTADOS = [
  { icono: Check, texto: "Puede ver y modificar", clases: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300" },
  { icono: Eye, texto: "Solo puede ver", clases: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-300" },
  { icono: X, texto: "Sin acceso", clases: "border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300" },
] as const;

export function LeyendaEstados() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Significado de los estados">
      {ESTADOS.map(({ icono: Icono, texto, clases }) => (
        <Badge
          key={texto}
          variant="outline"
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-semibold ${clases}`}
        >
          <Icono aria-hidden="true" className="h-3.5 w-3.5" />
          {texto}
        </Badge>
      ))}
    </div>
  );
}
