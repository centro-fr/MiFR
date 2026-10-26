import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";

interface PropsEncabezado {
  titulo?: string;
  descripcion?: string;
  /** Controles de la pestaña abierta (mes, exportar, nuevo), a la derecha del título. */
  acciones?: ReactNode;
}

export function EncabezadoHonorarios({
  titulo = "Honorarios",
  descripcion = "Cuánto le corresponde a cada profesor/a en el mes. Es solo informativo: El sistema no mueve dinero.",
  acciones,
}: PropsEncabezado) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
          {descripcion}
        </p>
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  );
}

// "Suplencias" (US-24): registro de suplencias docentes para el cálculo de honorarios.
const PESTANAS = [
  { etiqueta: "Honorarios del mes", to: "/app/honorarios", end: true },
  { etiqueta: "Suplencias", to: "/app/honorarios/suplencias", end: false },
];

export function PestanasHonorarios({ cantidadSuplencias }: { cantidadSuplencias?: number }) {
  // El mes elegido (?mes=) se conserva al pasar de una pestaña a la otra.
  const { search } = useLocation();
  return (
    <div className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none">
      {PESTANAS.map(({ etiqueta, to, end }) => (
        <NavLink
          key={to}
          to={{ pathname: to, search }}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex min-h-11 items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors shrink-0",
              isActive
                ? "border-primary text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span>{etiqueta}</span>
              {etiqueta === "Suplencias" && cantidadSuplencias !== undefined && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-black transition-colors",
                    isActive
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  )}
                >
                  {cantidadSuplencias}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}
