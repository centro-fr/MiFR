import { LeyendaEstados } from "@/features/seguridad/components/leyenda-estados";

// Encabezado: breadcrumb, título, descripción y leyenda. La confirmación de
// cambios (guardar/descartar) vive en el dock flotante inferior,
// mismo patrón que /app/horarios.
export function MatrizToolbar() {
  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Ruta">
        <ol className="flex flex-wrap items-center gap-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          <li>Centro MiFR</li>
          <li aria-hidden="true">/</li>
          <li>Configuración</li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="font-bold text-slate-700 dark:text-slate-200">
            Permisos por Rol
          </li>
        </ol>
      </nav>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
          Definición de Permisos por Rol
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Configurá qué puede ver o modificar cada rol. Solo la propietaria puede alterar la matriz.
        </p>
      </div>
      <LeyendaEstados />
    </div>
  );
}
