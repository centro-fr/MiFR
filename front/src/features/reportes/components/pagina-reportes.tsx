import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { PESTANAS_REPORTES } from "@/features/reportes/utils/pestanas-reportes";
import { cn } from "@/utils/cn";

// Reportes de la propietaria (US-33 a US-37 y cobranza): una pestaña por informe, como en el diseño.
// Cada pestaña es una ruta, así se puede compartir el enlace a un informe puntual.

function Pestanas() {
  return (
    <nav aria-label="Reportes" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex min-w-max items-center gap-5 border-b border-slate-200 sm:gap-7 dark:border-slate-800">
        {PESTANAS_REPORTES.map(({ etiqueta, ruta }) => (
          <li key={ruta}>
            <NavLink
              to={`/app/reportes/${ruta}`}
              className={({ isActive }) =>
                cn(
                  "-mb-px flex min-h-11 items-center border-b-2 pb-2.5 text-sm font-bold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary text-slate-900 dark:text-white"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
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

interface PropsPagina {
  /** Controles del informe abierto (exportar), a la derecha del título. */
  acciones?: ReactNode;
  children: ReactNode;
}

export function PaginaReportes({ acciones, children }: PropsPagina) {
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 xl:text-3xl dark:text-white">Reportes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Los números del centro en detalle, por período. El Dashboard muestra el resumen del mes.</p>
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2">{acciones}</div>}
        </header>
        <Pestanas />
        {children}
      </div>
    </OwnerLayout>
  );
}
