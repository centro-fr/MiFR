import { useId, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SeccionFichaProps {
  titulo: string;
  /** Clase de fondo del punto que identifica la sección (ej: "bg-primary"). */
  colorPunto: string;
  /** Texto chico bajo el título (ej: quién puede ver la sección). */
  aclaracion?: string;
  className?: string;
  children: ReactNode;
}

export function SeccionFicha({ titulo, colorPunto, aclaracion, className, children }: SeccionFichaProps) {
  const idTitulo = useId();
  return (
    <section
      aria-labelledby={idTitulo}
      className={cn(
        "flex flex-col gap-3 rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-surface-low",
        className,
      )}
    >
      <div className="flex flex-col gap-1 border-b border-slate-100 pb-2.5 dark:border-white/10">
        <h2
          id={idTitulo}
          className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white"
        >
          <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", colorPunto)} />
          {titulo}
        </h2>
        {aclaracion && <p className="text-sm text-muted-foreground">{aclaracion}</p>}
      </div>
      {children}
    </section>
  );
}

/** Valor ausente (columna NULL en el DER): se dice explícitamente en lugar de dejar un hueco. */
export function SinDato({ texto = "Sin cargar" }: { texto?: string }) {
  return <span className="font-medium italic text-muted-foreground">{texto}</span>;
}

interface DatoFichaProps {
  etiqueta: string;
  children: ReactNode;
}

/** Par etiqueta/valor. Va dentro de un <dl>. */
export function DatoFicha({ etiqueta, children }: DatoFichaProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-bold text-slate-600 dark:text-slate-400">{etiqueta}</dt>
      <dd className="break-words rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}
