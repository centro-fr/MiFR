import type { ReactNode } from "react";

export interface PropsDelControl {
  id: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
}

interface Props {
  id: string;
  etiqueta: string;
  obligatorio?: boolean;
  ayuda?: ReactNode;
  error?: string;
  /** Recibe los atributos de accesibilidad que enlazan el control con su ayuda y su error. */
  children: (props: PropsDelControl) => ReactNode;
}

export function CampoPlan({ id, etiqueta, obligatorio = false, ayuda, error, children }: Props) {
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const descripciones = [ayuda ? idAyuda : null, error ? idError : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {etiqueta}
        {obligatorio && (
          <>
            {" "}
            <span className="text-rose-600" aria-hidden="true">*</span>
            <span className="sr-only">(obligatorio)</span>
          </>
        )}
      </label>
      {children({ id, "aria-invalid": error !== undefined, "aria-describedby": descripciones })}
      {ayuda && (
        <p id={idAyuda} className="text-sm text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={idError} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tarjeta numerada de una sección del formulario ("1. Datos del plan"). */
export function SeccionPlan({ titulo, color, children }: { titulo: string; color: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5 dark:bg-surface-low">
      <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-extrabold tracking-wide text-slate-900 uppercase dark:border-white/10 dark:text-white">
        <span aria-hidden="true" className={`size-2 rounded-full ${color}`} />
        {titulo}
      </h2>
      {children}
    </section>
  );
}
