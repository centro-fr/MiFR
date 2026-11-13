import { createContext, useContext, type ReactNode } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { cn } from "@/utils/cn";

// Reportes de la propietaria (US-33 a US-37 y cobranza): cada informe se accede desde la sección
// REPORTES del menú lateral.

const AccionesReportesContext = createContext<ReactNode>(null);

export function useAccionesReportes(): ReactNode {
  return useContext(AccionesReportesContext);
}

interface PropsPagina {
  titulo?: ReactNode;
  subtitulo?: ReactNode;
  /** Controles del informe abierto (exportar), a la derecha del título. */
  acciones?: ReactNode;
  /** Si las acciones se reubican junto al botón Filtros en mobile/tablet (< xl). */
  accionesEnFiltros?: boolean;
  children: ReactNode;
}

export function PaginaReportes({ titulo, subtitulo, acciones, accionesEnFiltros = true, children }: PropsPagina) {
  return (
    <OwnerLayout>
      <AccionesReportesContext.Provider value={accionesEnFiltros ? acciones : null}>
        <div className="space-y-6 min-w-0">
          {/* ENCABEZADO PRINCIPAL */}
          {titulo && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
                  {titulo}
                </h1>
                {subtitulo && (
                  <p className="text-sm text-muted-foreground mt-1.5 font-medium leading-relaxed">
                    {subtitulo}
                  </p>
                )}
              </div>
              {acciones && (
                <div
                  className={cn(
                    "shrink-0 items-center gap-2 self-start sm:self-auto",
                    accionesEnFiltros ? "hidden xl:flex" : "flex",
                  )}
                >
                  {acciones}
                </div>
              )}
            </div>
          )}

          {/* CONTENIDO DEL REPORTE */}
          {children}
        </div>
      </AccionesReportesContext.Provider>
    </OwnerLayout>
  );
}
