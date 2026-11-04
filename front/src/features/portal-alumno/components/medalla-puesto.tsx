import { Medal } from "lucide-react";
import { cn } from "@/utils/cn";

// Oro, plata y bronce para el podio; el resto muestra el número. Lo comparten el ranking de la
// comunidad y el de Reportes para que se vean iguales.
const COLOR_DEL_PODIO = [
  "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
  "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
];

const TAMANIO = {
  normal: "size-10 rounded-xl",
  chico: "size-8 rounded-lg",
};

interface MedallaPuestoProps {
  posicion: number;
  tamanio?: keyof typeof TAMANIO;
}

export function MedallaPuesto({ posicion, tamanio = "normal" }: MedallaPuestoProps) {
  const esPodio = posicion <= 3;
  return (
    <div
      aria-label={`Puesto ${posicion}`}
      className={cn(
        "flex shrink-0 items-center justify-center text-sm font-black tabular-nums",
        TAMANIO[tamanio],
        esPodio ? COLOR_DEL_PODIO[posicion - 1] : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {esPodio ? <Medal aria-hidden="true" className={tamanio === "chico" ? "size-4" : "size-5"} /> : posicion}
    </div>
  );
}
