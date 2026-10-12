import type { Disponibilidad, HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { horaDesdeApi, textoDisponibilidad } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";

// Una clase en la cartelera pública: todas con el mismo fondo blanco, y los lugares con la escala de US-32.

const PUNTO_DISPONIBILIDAD: Record<Disponibilidad, string> = {
  LIBRE: "bg-[#10B981]",
  CASI_LLENO: "bg-[#F59E0B]",
  COMPLETO: "bg-[#EF4444]",
  SIN_LIMITE: "bg-slate-400",
};

export function Lugares({ horario, className }: { horario: HorarioPublico; className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 font-bold text-foreground", className)}>
      <span aria-hidden="true" className={cn("size-2 rounded-full", PUNTO_DISPONIBILIDAD[horario.disponibilidad])} />
      {textoDisponibilidad(horario.disponibilidad, horario.cupo_disponible)}
    </span>
  );
}

export function TarjetaHorarioPublico({ horario }: { horario: HorarioPublico }) {
  const desde = horaDesdeApi(horario.hora_inicio);
  const hasta = horaDesdeApi(horario.hora_fin);

  return (
    <article
      aria-label={`${horario.actividad.nombre}, de ${desde} a ${hasta}`}
      title={`${horario.actividad.nombre} · ${desde} a ${hasta} · ${horario.profesora.nombre} ${horario.profesora.apellido}`}
      className="flex h-full flex-col justify-center gap-0.5 rounded-xl border border-border bg-card px-2.5 py-2 shadow-2xs"
    >
      <h4 className="truncate text-sm font-extrabold leading-tight text-foreground">{horario.actividad.nombre}</h4>
      <p className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="truncate">{horario.profesora.nombre}</span>
        <Lugares horario={horario} className="text-xs" />
      </p>
    </article>
  );
}
