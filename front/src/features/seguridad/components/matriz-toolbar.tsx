import { LeyendaEstados } from "@/features/seguridad/components/leyenda-estados";

// Encabezado: título, descripción y leyenda. La confirmación de
// cambios (guardar/descartar) vive en el dock flotante inferior,
// mismo patrón que /app/horarios.
export function MatrizToolbar() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white">
          Definición de Permisos por Rol
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Configurá qué puede ver o modificar cada rol.
        </p>
      </div>
      <LeyendaEstados />
    </div>
  );
}
