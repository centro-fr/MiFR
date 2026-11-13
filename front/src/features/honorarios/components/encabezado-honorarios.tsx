import type { ReactNode } from "react";

interface PropsEncabezado {
  titulo?: string;
  descripcion?: string;
  /** Controles de la pantalla (mes, exportar, nuevo), a la derecha del título. */
  acciones?: ReactNode;
}

export function EncabezadoHonorarios({
  titulo = "Honorarios",
  descripcion = "Cuánto le corresponde a cada profesor/a en el mes. Es solo informativo: El sistema no mueve dinero.",
  acciones,
}: PropsEncabezado) {
  // Título y controles van lado a lado solo si entran: se mide el contenido (sin el menú lateral), no la pantalla.
  return (
    <div className="@container">
      <div className="flex flex-col gap-4 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            {titulo}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
            {descripcion}
          </p>
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2 @3xl:shrink-0">{acciones}</div>}
      </div>
    </div>
  );
}
