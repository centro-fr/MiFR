import { cn } from "@/utils/cn";

// Clases de los campos de los formularios de rutina y de medición: las mismas del diálogo de tarifas.

export const CONTROL =
  "min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-base font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-rose-500 dark:border-white/15 dark:bg-white/5 dark:text-white";
export const AREA_DE_TEXTO = cn(CONTROL, "min-h-20 py-2.5 font-normal");
// El Input base de CampoFecha achica la letra desde md.
export const CONTROL_FECHA = cn(CONTROL, "md:text-base");
export const ETIQUETA = "text-sm font-bold text-slate-800 dark:text-slate-200";
