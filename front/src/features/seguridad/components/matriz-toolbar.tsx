import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { LeyendaEstados } from "@/features/seguridad/components/leyenda-estados";
import { cn } from "@/utils/cn";

interface MatrizToolbarProps {
  cambiosPendientes: number;
  isSaving: boolean;
  onGuardar: () => void;
  onDescartar: () => void;
  /** En mobile los botones viven en la barra fija inferior: se ocultan aquí. */
  compactActions?: boolean;
}

// Encabezado estilo Stitch: breadcrumb, título, leyenda y acciones.
export function MatrizToolbar({ cambiosPendientes, isSaving, onGuardar, onDescartar, compactActions }: MatrizToolbarProps) {
  const hayCambios = cambiosPendientes > 0;
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Ruta">
        <ol className="flex flex-wrap items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
          <li>Centro MiFR</li>
          <li aria-hidden="true">/</li>
          <li>Configuración</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-bold text-slate-700 dark:text-slate-200">Permisos por Rol</li>
        </ol>
      </nav>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            Definición de Permisos por Rol
          </h1>
          <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            Configurá qué puede ver o modificar cada rol. Solo la propietaria puede alterar la matriz.
          </p>
        </div>
        <div className={cn("flex flex-wrap items-center gap-2", compactActions && "hidden lg:flex")}>
          {hayCambios && (
            <span aria-live="polite" className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary-dark dark:bg-primary/20 dark:text-pink-300">
              {cambiosPendientes} {cambiosPendientes === 1 ? "cambio pendiente" : "cambios pendientes"}
            </span>
          )}
          <Button
            onClick={onDescartar}
            disabled={!hayCambios || isSaving}
            aria-disabled={!hayCambios || isSaving}
            className="border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Descartar
          </Button>
          <Button
            onClick={onGuardar}
            disabled={!hayCambios || isSaving}
            aria-disabled={!hayCambios || isSaving}
            className="bg-primary text-white hover:bg-primary-dark"
          >
            {isSaving ? <Spinner className="h-4 w-4 text-white" /> : <Save aria-hidden="true" className="h-4 w-4" />}
            {isSaving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
      <LeyendaEstados />
    </div>
  );
}
