import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { PESTANAS_REPORTES } from "@/features/reportes/utils/pestanas-reportes";
import { cn } from "@/utils/cn";

// Reportes de la propietaria (US-33 a US-37 y cobranza): una pestaña por informe, según el diseño unificado.
// Cada pestaña es una ruta compartible.

function Pestanas() {
  return (
    <nav
      aria-label="Reportes"
      className="flex items-center gap-4 sm:gap-6 border-b border-slate-200 dark:border-slate-800 pt-1 overflow-x-auto scrollbar-none"
    >
      {PESTANAS_REPORTES.map(({ etiqueta, ruta }) => (
        <NavLink
          key={ruta}
          to={`/app/reportes/${ruta}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              isActive
                ? "border-primary text-slate-900 dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
            )
          }
        >
          {etiqueta}
        </NavLink>
      ))}
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
      <div className="space-y-6 min-w-0">
        {/* ENCABEZADO PRINCIPAL */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl xl:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Reportes
            </h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium leading-relaxed">
              Los números del centro en detalle, por período. El Dashboard muestra el resumen del mes.
            </p>
          </div>
          {acciones && <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">{acciones}</div>}
        </div>

        {/* PESTAÑAS DE NAVEGACIÓN */}
        <Pestanas />

        {/* CONTENIDO DEL REPORTE */}
        {children}
      </div>
    </OwnerLayout>
  );
}
