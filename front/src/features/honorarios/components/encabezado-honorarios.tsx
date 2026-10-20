import type { ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/utils/cn";

interface PropsEncabezado {
  /** Controles de la pestaña abierta (mes, exportar), a la derecha del título. */
  acciones?: ReactNode;
}

export function EncabezadoHonorarios({ acciones }: PropsEncabezado) {
  return (
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-tight text-dark xl:text-3xl dark:text-white">Honorarios</h1>
        <p className="mt-1 text-sm leading-relaxed font-medium text-muted-foreground">
          Cuánto le corresponde a cada profesora en el mes. Es solo informativo: el sistema no mueve dinero.
        </p>
      </div>
      {acciones && <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>}
    </header>
  );
}

// "Suplencias" es la US-24, que hace otro integrante del front: la pestaña lleva a su ruta.
const PESTANAS = [
  { etiqueta: "Liquidación del mes", to: "/app/honorarios", end: true },
  { etiqueta: "Suplencias", to: "/app/honorarios/suplencias", end: false },
];

export function PestanasHonorarios() {
  // El mes elegido (?mes=) se conserva al pasar de una pestaña a la otra.
  const { search } = useLocation();
  return (
    <nav aria-label="Secciones de honorarios" className="border-b border-border">
      <ul className="-mb-px flex gap-1 overflow-x-auto">
        {PESTANAS.map(({ etiqueta, to, end }) => (
          <li key={to} className="shrink-0">
            <NavLink
              to={{ pathname: to, search }}
              end={end}
              className={({ isActive }) =>
                cn(
                  "inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-bold transition-colors",
                  isActive
                    ? "border-primary text-dark dark:text-white"
                    : "border-transparent text-slate-500 hover:text-primary-dark dark:text-slate-400 dark:hover:text-pink-300",
                )
              }
            >
              {etiqueta}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
