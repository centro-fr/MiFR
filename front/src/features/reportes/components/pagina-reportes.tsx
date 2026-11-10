import type { ReactNode } from "react";
import { OwnerLayout } from "@/components/layout/owner-layout";

// Reportes de la propietaria (US-33 a US-37 y cobranza): cada informe se accede desde la sección
// REPORTES del menú lateral.

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

        {/* CONTENIDO DEL REPORTE */}
        {children}
      </div>
    </OwnerLayout>
  );
}
