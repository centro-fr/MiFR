import { useMisAlumnos } from "@/features/rutinas/hooks/use-rutinas";
import { useAlumnoElegidoStore } from "@/stores/alumno-elegido-store";
import type { AlumnoConsultable } from "@/types/rutinas";

/**
 * De quién se muestran los datos del portal: el alumno de la sesión o, para el tutor, el menor que eligió
 * (el primero mientras no elija). `alumnos` trae a todos los que puede ver, para el selector.
 */
export function useAlumnoElegido() {
  const consulta = useMisAlumnos();
  const idElegido = useAlumnoElegidoStore((estado) => estado.idAlumnoElegido);
  const elegirAlumno = useAlumnoElegidoStore((estado) => estado.elegirAlumno);
  const alumnos: AlumnoConsultable[] = consulta.data ?? [];
  const elegido = alumnos.find((alumno) => alumno.id === idElegido) ?? alumnos[0];
  return { consulta, alumnos, elegido, elegirAlumno };
}
