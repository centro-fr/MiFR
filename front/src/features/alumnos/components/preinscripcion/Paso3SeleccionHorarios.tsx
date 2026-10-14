import { Clock, Check, Users, AlertCircle, Dumbbell } from "lucide-react";
import { cn } from "@/utils/cn";
import { Badge } from "@/components/ui/badge";
import type { HorarioApi } from "@/features/horarios/schemas/horario";

interface Paso3SeleccionHorariosProps {
  horarios: HorarioApi[];
  idsSeleccionados: number[];
  onToggleHorario: (idHorario: number) => void;
  clasesRequeridas: number;
}

const DIAS_NOMBRES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function formatoHora(horaIso: string): string {
  if (horaIso.includes("T")) {
    const parte = horaIso.split("T")[1];
    return parte.slice(0, 5);
  }
  return horaIso.slice(0, 5);
}

export function Paso3SeleccionHorarios({
  horarios,
  idsSeleccionados,
  onToggleHorario,
  clasesRequeridas,
}: Paso3SeleccionHorariosProps) {
  // Ordenar por día y luego por hora de inicio
  const horariosOrdenados = [...horarios].sort((a, b) => {
    if (a.dia_semana !== b.dia_semana) return a.dia_semana - b.dia_semana;
    return a.hora_inicio.localeCompare(b.hora_inicio);
  });

  const faltan = clasesRequeridas - idsSeleccionados.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/40 border border-border/40">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            Horarios Semanales Fijos
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Elegí las clases a las que asistirá el alumno semanalmente.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant={idsSeleccionados.length === clasesRequeridas ? "default" : "secondary"}
            className="text-xs px-2.5 py-1 font-semibold"
          >
            {idsSeleccionados.length} / {clasesRequeridas} seleccionados
          </Badge>
          {faltan > 0 && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              (Falta{faltan > 1 ? "n" : ""} {faltan})
            </span>
          )}
        </div>
      </div>

      {horariosOrdenados.length === 0 ? (
        <div className="py-12 text-center rounded-xl border border-dashed border-border/60 bg-muted/10 space-y-3">
          <div className="size-10 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">No hay horarios disponibles</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              No se encontraron clases vigentes de la profesora para el plan elegido.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {horariosOrdenados.map((h) => {
            const isSelected = idsSeleccionados.includes(h.id_horario);
            const diaNombre = DIAS_NOMBRES[h.dia_semana - 1] || `Día ${h.dia_semana}`;
            const horaIni = formatoHora(h.hora_inicio);
            const horaFin = formatoHora(h.hora_fin);
            const cupo = h.cupo_maximo_efectivo ?? h.cupo_maximo;

            return (
              <div
                key={h.id_horario}
                onClick={() => onToggleHorario(h.id_horario)}
                className={cn(
                  "p-3.5 rounded-xl cursor-pointer transition-all duration-200 border text-left flex flex-col justify-between gap-2.5",
                  isSelected
                    ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/40 dark:bg-primary/10"
                    : "bg-card hover:bg-muted/40 border-border/70 hover:border-border",
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {diaNombre}
                    </span>
                    {isSelected ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="size-3.5 stroke-[3]" />
                      </span>
                    ) : (
                      <span className="size-5 rounded-full border border-border/80" />
                    )}
                  </div>

                  <div className="mt-1 flex items-baseline gap-1.5 font-semibold text-foreground text-sm">
                    <Clock className="size-3.5 text-muted-foreground shrink-0" />
                    <span>
                      {horaIni} – {horaFin}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 truncate max-w-[140px]">
                    <Dumbbell className="size-3 shrink-0" />
                    {h.actividad.nombre}
                  </span>

                  <span className="flex items-center gap-1 font-medium">
                    <Users className="size-3 shrink-0" />
                    {cupo ? `Cupo: ${cupo}` : "Sin cupo"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {faltan > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="size-4 shrink-0" />
          <span>
            Seleccioná {faltan} horario{faltan > 1 ? "s" : ""} más para completar los requerimientos del plan.
          </span>
        </div>
      )}
    </div>
  );
};
