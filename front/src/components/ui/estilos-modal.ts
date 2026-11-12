// Estilos únicos de los modales (Dialog y AlertDialog): contenedor, cabecera, título, subtítulo y
// pie. Los usan las piezas de estructura-modal.tsx y los modales que arman su propia estructura,
// así un cambio de estilo llega a todos.

export const CONTENIDO_MODAL =
  "flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900";

export const CABECERA_MODAL =
  "shrink-0 border-b border-slate-200 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900";

export const TITULO_MODAL = "text-lg font-bold tracking-tight text-slate-900 dark:text-white";

export const DESCRIPCION_MODAL = "text-sm text-slate-500 dark:text-slate-400";

// flex-wrap: si los textos de los botones no entran en una fila (celular), bajan a la siguiente.
export const PIE_MODAL =
  "flex shrink-0 flex-row flex-wrap items-center justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900";

export const BOTON_MODAL = "min-h-11 rounded-xl font-bold";

export const BOTON_MODAL_PRINCIPAL = `${BOTON_MODAL} bg-primary text-white hover:bg-primary-dark`;

// Separaciones del contenido: 20px entre bloques (campos, secciones, avisos) y 6px entre la etiqueta
// y su control. Las filas de dos campos separan 16px a lo ancho y, apiladas en el celular, 20px.
export const CUERPO_MODAL = "min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5";

export const CAMPO_MODAL = "flex flex-col gap-1.5";

export const FILA_DE_CAMPOS_MODAL = "grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2";
