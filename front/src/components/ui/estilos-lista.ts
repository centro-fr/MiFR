import { cn } from "@/utils/cn";

// Clases que comparten los listados: la tabla en pantallas anchas y la lista de filas en el celular
// (mismo formato que Alumnos y Cobros).

/** Contenedor de la lista del celular cuando no está dentro de la tarjeta de la tabla. */
export const LISTA_MOVIL =
  "overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-2xs divide-y divide-slate-100 dark:border-slate-700/80 dark:bg-slate-900 dark:divide-slate-800";

/** Separador de filas cuando la lista va dentro de la tarjeta que también tiene la tabla. */
export const LISTA_MOVIL_EN_TARJETA = "divide-y divide-slate-100 dark:divide-slate-800/60";

/** Botón de acción de una fila ("Editar", "Ver detalle"). */
export const BOTON_FILA =
  "h-8 min-h-0 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10";

/** Acción que borra o da de baja: el mismo botón, con el rojo al pasar el mouse. */
export const BOTON_FILA_PELIGRO =
  "h-8 min-h-0 shrink-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-rose-600 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-rose-400";

/** Reincorporar lo que está de baja. */
export const BOTON_FILA_REINCORPORAR =
  "h-8 min-h-0 shrink-0 rounded-lg border-emerald-200 bg-emerald-50/70 px-3 text-xs font-bold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20";

/** Contenedor de los filtros de un listado: oculto en el celular hasta abrirlo con BotonFiltrosMovil. */
export function clasePanelFiltros(abierto: boolean): string {
  return cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !abierto && "hidden xl:flex");
}
