import { cn } from "@/utils/cn";

export interface OpcionPestana<T extends string> {
  id: T;
  etiqueta: string;
  /** Cantidad que se muestra en la píldora de la pestaña ("Todos 29"). */
  conteo?: number;
}

interface Props<T extends string> {
  opciones: OpcionPestana<T>[];
  valor: T;
  onCambiar: (id: T) => void;
  /** Qué se elige, para el lector de pantalla ("Estado de los alumnos"). */
  etiqueta: string;
  className?: string;
}

/**
 * Pestañas para elegir qué se lista (Todos, Dados de baja, Contactar…) o cómo se ve (Mensual, Anual):
 * el mismo formato en todas las pantallas, en el celular y en escritorio. Todas van contenidas dentro
 * de un borde único alineado a la altura de los selectores adyacentes; la elegida lleva fondo y su
 * contador va en rosa.
 */
export function PestanasFiltro<T extends string>({ opciones, valor, onCambiar, etiqueta, className }: Props<T>) {
  return (
    <div
      role="tablist"
      aria-label={etiqueta}
      className={cn(
        "inline-flex w-fit max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-300 bg-card p-1 dark:border-slate-700",
        className,
      )}
    >
      {opciones.map((opcion) => {
        const elegida = opcion.id === valor;
        return (
          <button
            key={opcion.id}
            type="button"
            role="tab"
            aria-selected={elegida}
            onClick={() => onCambiar(opcion.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs font-bold transition-all md:h-7",
              elegida
                ? "bg-slate-100 text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white",
            )}
          >
            <span>{opcion.etiqueta}</span>
            {opcion.conteo !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-extrabold",
                  elegida ? "bg-primary text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                )}
              >
                {opcion.conteo}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
