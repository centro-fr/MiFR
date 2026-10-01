import { Check, Eye, X } from "lucide-react";

// Leyenda de los 3 estados resultantes (lenguaje Stitch): combinan los
// switches *_VER y *_EDITAR de cada módulo.
const ESTADOS = [
  { icono: Check, texto: "Puede ver y modificar", clases: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { icono: Eye, texto: "Solo puede ver", clases: "bg-amber-50 text-amber-700 border-amber-200" },
  { icono: X, texto: "Sin acceso", clases: "bg-slate-100 text-slate-500 border-slate-200" },
] as const;

export function LeyendaEstados() {
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Significado de los estados">
      {ESTADOS.map(({ icono: Icono, texto, clases }) => (
        <span
          key={texto}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${clases}`}
        >
          <Icono aria-hidden="true" className="h-3.5 w-3.5" />
          {texto}
        </span>
      ))}
    </div>
  );
}
