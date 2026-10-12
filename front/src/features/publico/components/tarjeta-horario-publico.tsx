import { Clock, User } from "lucide-react";
import type { Disponibilidad, HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { horaDesdeApi, textoDisponibilidad } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";

// Colores de front/AGENTS.md: libre verde, casi lleno amarillo, completo rojo; grupal azul y
// personalizada violeta. Los tonos de texto oscuros mantienen el contraste sobre el fondo claro.
const ESTILO_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  LIBRE: "bg-emerald-50 text-emerald-800 ring-emerald-600/30 dark:bg-emerald-500/15 dark:text-emerald-300",
  CASI_LLENO: "bg-amber-50 text-amber-800 ring-amber-600/30 dark:bg-amber-500/15 dark:text-amber-300",
  COMPLETO: "bg-red-50 text-red-800 ring-red-600/30 dark:bg-red-500/15 dark:text-red-300",
  SIN_LIMITE: "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-white/10 dark:text-slate-300",
};

const MODALIDAD = {
  GRUPAL: { texto: "Grupal", borde: "border-l-[#3B82F6]" },
  PERSONALIZADA: { texto: "Personalizada", borde: "border-l-[#8B5CF6]" },
} as const;

export function TarjetaHorarioPublico({ horario }: { horario: HorarioPublico }) {
  const modalidad = MODALIDAD[horario.actividad.modalidad];
  const inicio = horaDesdeApi(horario.hora_inicio);
  const fin = horaDesdeApi(horario.hora_fin);

  return (
    <article
      aria-label={`${horario.actividad.nombre}, de ${inicio} a ${fin}`}
      className={cn(
        "flex flex-col gap-2 rounded-xl border border-l-4 border-border bg-card p-3 shadow-sm",
        modalidad.borde,
      )}
    >
      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
        <Clock aria-hidden="true" className="size-4 text-primary" />
        {inicio} – {fin}
      </p>
      <div>
        <h4 className="text-base font-extrabold leading-snug text-foreground">{horario.actividad.nombre}</h4>
        <p className="text-sm text-muted-foreground">{modalidad.texto}</p>
      </div>
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <User aria-hidden="true" className="size-4 shrink-0" />
        {horario.profesora.nombre} {horario.profesora.apellido}
      </p>
      <p
        className={cn(
          "self-start rounded-full px-2.5 py-1 text-sm font-bold ring-1 ring-inset",
          ESTILO_DISPONIBILIDAD[horario.disponibilidad],
        )}
      >
        {textoDisponibilidad(horario.disponibilidad, horario.cupo_disponible)}
      </p>
    </article>
  );
}
