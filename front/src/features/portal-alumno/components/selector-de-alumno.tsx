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
 * En la barra superior, para el tutor: elige de quién ver los datos (sus menores y, si también entrena, él
 * mismo) y la elección vale para todas las pantallas del portal. Con un solo alumno no se muestra.
 */
export function SelectorDeAlumno({ sobreFondoOscuro = false }: { sobreFondoOscuro?: boolean }) {
  const { alumnos, elegido, elegirAlumno } = useAlumnoElegido();
  if (alumnos.length < 2 || !elegido) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viendo los datos de ${elegido.propio ? "vos" : `${elegido.nombre} ${elegido.apellido}`}. Cambiar`}
          className={cn(
            "flex h-9 max-w-[42vw] shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
            // Neutro como los demás botones de la barra; el rosa queda solo en el ícono.
            sobreFondoOscuro
              ? "border-white/15 bg-white/5 text-white hover:bg-white/10"
              : "border-border bg-card text-foreground hover:bg-slate-100 dark:hover:bg-white/10",
          )}
        >
          <UsersRound aria-hidden="true" className={cn("size-4 shrink-0", sobreFondoOscuro ? "text-pink-300" : "text-primary dark:text-pink-300")} />
          <span className="truncate">
            {elegido.nombre}
            <span className="hidden sm:inline"> {elegido.apellido}</span>
            {elegido.propio && " (vos)"}
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
              {alumno.propio && " (vos)"}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
