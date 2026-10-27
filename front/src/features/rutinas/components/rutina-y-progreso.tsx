import { Info } from "lucide-react";
import { TarjetaEvolucion } from "@/features/rutinas/components/tarjeta-evolucion";
import { TarjetaRutina } from "@/features/rutinas/components/tarjeta-rutina";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";

interface PropsRutinaYProgreso {
  idAlumno: number;
  nombreAlumno: string;
  /** false con el alumno dado de baja: su historial se consulta, pero ya no se le cargan datos. */
  admiteCargas: boolean;
}

/**
 * US-27: pestaña "Rutina y progreso" de la ficha del alumno. La profesora solo llega a la ficha de sus
 * alumnos a cargo, y el back aplica la misma regla al cargar y al consultar.
 */
export function RutinaYProgreso({ idAlumno, nombreAlumno, admiteCargas }: PropsRutinaYProgreso) {
  const { hasPermission } = usePermissions();
  if (!hasPermission("RUTINAS_VER")) {
    return <p className="text-sm text-slate-600 dark:text-slate-300">No tenés permiso para ver la rutina y el progreso de los alumnos.</p>;
  }
  const puedeCargar = admiteCargas && hasPermission("RUTINAS_EDITAR");

  return (
    <div className="flex flex-col gap-4">
      {!admiteCargas && (
        <p className="flex items-start gap-2 rounded-xl bg-slate-100 p-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Está dado de baja: se puede consultar su historial, pero no cargarle rutinas ni mediciones nuevas.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <TarjetaRutina idAlumno={idAlumno} nombreAlumno={nombreAlumno} puedeCargar={puedeCargar} />
        <TarjetaEvolucion idAlumno={idAlumno} nombreAlumno={nombreAlumno} puedeCargar={puedeCargar} />
      </div>
    </div>
  );
}
