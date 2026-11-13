import { useAlumnoElegido } from "../hooks/use-alumno-elegido";
import { SelectorDeAlumno } from "./selector-de-alumno";
import { SelectorDePlan } from "./selector-de-plan";

/**
 * Selector central de la barra del portal: para el tutor muestra el selector de alumno (con sus
 * planes si tiene más de uno); para el alumno individual, el selector de plan si tiene 2+.
 */
export function SelectorDelPortal({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const { alumnos } = useAlumnoElegido();
  if (alumnos.length >= 2) {
    return <SelectorDeAlumno sobreFondoOscuro={sobreFondoOscuro} />;
  }
  return <SelectorDePlan sobreFondoOscuro={sobreFondoOscuro} />;
}

