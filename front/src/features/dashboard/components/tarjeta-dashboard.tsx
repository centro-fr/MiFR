import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/utils/cn";

interface Props {
  id: string;
  titulo: string;
  subtitulo?: ReactNode;
  /** Controles a la derecha del título (filtros de la tarjeta). */
  acciones?: ReactNode;
  /** Enlace al pie: "Ver todo", "Ver reporte"… */
  pie?: { texto: string; to: string };
  /** Texto a la izquierda del pie (por ejemplo, un total). */
  resumen?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** EstadoErrorCarga dentro de una tarjeta: sin su propio borde ni fondo. */
export const ERROR_EN_TARJETA = "border-0 bg-transparent py-6 shadow-none dark:bg-transparent";

// Un bloque del dashboard: título, contenido y, si hay más para ver, un enlace al pie.
export function TarjetaDashboard({ id, titulo, subtitulo, acciones, pie, resumen, className, children }: Props) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="min-w-0">
          <h2 id={id} className="text-sm font-bold text-slate-900 dark:text-white">
            {titulo}
          </h2>
          {subtitulo && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitulo}</p>}
        </div>
        {acciones}
      </header>
      <div className="min-h-0 flex-1 px-4">{children}</div>
      {(pie || resumen) && (
        <footer className="flex min-h-11 items-center justify-between gap-3 border-t border-slate-200 px-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span>{resumen}</span>
          {pie && (
            <Link to={pie.to} className="flex min-h-11 items-center font-semibold text-primary-dark hover:underline dark:text-pink-300">
              {pie.texto}
            </Link>
          )}
        </footer>
      )}
    </section>
  );
}
