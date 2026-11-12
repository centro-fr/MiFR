import { ChevronDown, UsersRound } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/utils/cn";
import { useAlumnoElegido } from "../hooks/use-alumno-elegido";

/**
 * En la barra superior, para el tutor con más de un menor: elige de quién ver los datos y la elección vale
 * para todas las pantallas del portal. Con un solo alumno no se muestra.
 */
export function SelectorDeAlumno({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const { alumnos, elegido, elegirAlumno } = useAlumnoElegido();
  if (alumnos.length < 2 || !elegido) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viendo los datos de ${elegido.nombre} ${elegido.apellido}. Cambiar`}
          className={cn(
            "flex h-9 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
            // Los colores del ítem activo del sidebar: lo que se está mirando.
            sobreFondoOscuro
              ? "border-primary/30 bg-[#281525] text-white hover:border-primary/50"
              : "border-pink-200 bg-pink-50 text-primary-dark hover:bg-pink-100 dark:border-primary/40 dark:bg-primary/15 dark:text-pink-200",
          )}
        >
          <UsersRound aria-hidden="true" className="size-4 shrink-0 text-primary dark:text-pink-300" />
          <span className="truncate">
            {elegido.nombre}
            <span className="hidden sm:inline"> {elegido.apellido}</span>
          </span>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-52">
        <DropdownMenuLabel>Ver los datos de</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={String(elegido.id)} onValueChange={(valor) => elegirAlumno(Number(valor))}>
          {alumnos.map((alumno) => (
            <DropdownMenuRadioItem key={alumno.id} value={String(alumno.id)} className="min-h-10">
              {alumno.nombre} {alumno.apellido}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
