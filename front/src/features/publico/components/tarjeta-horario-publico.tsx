import { Badge } from "@/components/ui/badge";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { Disponibilidad, HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { textoDisponibilidad } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";

// Piezas de la tarjeta de una clase, con el diseño del cronograma de la propietaria
// (features/horarios): el color sale de la modalidad, la profesora va en un badge y el cupo en una
// píldora. Acá la píldora dice cuántos lugares quedan, con el color de US-32.

const PUNTO_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  LIBRE: "bg-[#10B981]",
  CASI_LLENO: "bg-[#F59E0B]",
  COMPLETO: "bg-[#EF4444]",
  SIN_LIMITE: "bg-slate-400",
};

interface BadgeProfesoraProps {
  horario: HorarioPublico;
  // En la grilla de escritorio la tarjeta es angosta: va solo el nombre, como en el cronograma interno.
  soloNombre?: boolean;
  className?: string;
}

export function BadgeProfesora({ horario, soloNombre = false, className }: BadgeProfesoraProps) {
  const tema = temaDeModalidad(horario.actividad.modalidad);
  const { nombre, apellido } = horario.profesora;
  return (
    <Badge
      variant="outline"
      title={`${nombre} ${apellido}`}
      className={cn("truncate rounded-md border-0 font-extrabold shadow-2xs", className)}
      style={{ backgroundColor: tema.badgeBg, color: tema.badgeText }}
    >
      {soloNombre ? nombre : `${nombre} ${apellido}`}
    </Badge>
  );
}

export function PildoraLugares({ horario, className }: { horario: HorarioPublico; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-black/5 bg-white/80 px-2 py-0.5 text-xs font-bold text-foreground/80 shadow-2xs dark:border-white/10 dark:bg-black/30",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-2 rounded-full", PUNTO_DISPONIBILIDAD[horario.disponibilidad])} />
      <strong className="text-foreground">{textoDisponibilidad(horario.disponibilidad, horario.cupo_disponible)}</strong>
    </span>
  );
}
