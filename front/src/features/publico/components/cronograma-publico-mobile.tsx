import { useState } from "react";
import { Clock, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { clasesDelDia, DIAS_DEL_CENTRO, diaInicial, horaDesdeApi } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";
import { BadgeProfesora, PildoraLugares } from "./tarjeta-horario-publico";

// La misma lista por día que el cronograma de la propietaria en el celular (CronogramaListMobile),
// solo de consulta. Empieza en el día de hoy, o en el próximo que tenga clases.

function ClaseDelDia({ horario }: { horario: HorarioPublico }) {
  const tema = temaDeModalidad(horario.actividad.modalidad);
  const desde = horaDesdeApi(horario.hora_inicio);
  const hasta = horaDesdeApi(horario.hora_fin);

  return (
    <Card
      aria-label={`${horario.actividad.nombre}, de ${desde} a ${hasta}`}
      className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border-slate-200/80 p-4 shadow-xs dark:border-white/10"
    >
      <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: tema.primary }} />
      <div className="flex items-center justify-between gap-2">
        <Badge
          variant="outline"
          className="gap-1.5 rounded-lg border-0 bg-slate-100 px-2.5 py-1 text-sm font-extrabold text-foreground dark:bg-white/10"
        >
          <Clock aria-hidden="true" className="size-3.5 text-muted-foreground" />
          {desde} - {hasta} hs
        </Badge>
        <BadgeProfesora horario={horario} className="max-w-[160px] px-2.5 py-0.5 text-sm" />
      </div>
      <h4 className="text-base font-extrabold leading-tight text-foreground">{horario.actividad.nombre}</h4>
      <div className="flex items-center gap-1.5 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        <Users aria-hidden="true" className="size-3.5 text-slate-400" />
        <span>Lugares:</span>
        <PildoraLugares horario={horario} className="border-0 bg-transparent p-0 text-sm shadow-none dark:bg-transparent" />
      </div>
    </Card>
  );
}

export function CronogramaPublicoMobile({ horarios }: { horarios: HorarioPublico[] }) {
  const [diaElegido, setDiaElegido] = useState(() => diaInicial(new Date(), horarios));
  const elegido = DIAS_DEL_CENTRO.find(({ numero }) => numero === diaElegido) ?? DIAS_DEL_CENTRO[0];
  const clases = clasesDelDia(horarios, elegido.numero);

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-slate-50/50 dark:bg-white/5">
      <div role="group" aria-label="Elegí el día" className="border-b border-border bg-card px-3 py-2.5">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {DIAS_DEL_CENTRO.map(({ numero, nombre }) => {
            const elegida = numero === elegido.numero;
            const cantidad = clasesDelDia(horarios, numero).length;
            return (
              <Button
                key={numero}
                type="button"
                aria-pressed={elegida}
                aria-label={`${nombre}, ${cantidad} ${cantidad === 1 ? "clase" : "clases"}`}
                onClick={() => setDiaElegido(numero)}
                className={cn(
                  "shrink-0 gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition-colors",
                  elegida
                    ? "bg-primary text-white shadow-xs hover:bg-primary"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15",
                )}
              >
                {nombre}
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full border-0 px-1.5 py-0.5 text-sm font-extrabold",
                    elegida
                      ? "bg-white/25 text-white"
                      : "bg-slate-200/80 text-slate-600 dark:bg-white/15 dark:text-slate-300",
                  )}
                >
                  {cantidad}
                </Badge>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex items-center gap-2 px-1">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-dark dark:text-white">{elegido.nombre}</h3>
          <span className="text-sm font-semibold text-slate-400">
            ({clases.length} {clases.length === 1 ? "clase" : "clases"})
          </span>
        </div>
        {clases.length === 0 ? (
          <Card className="rounded-2xl border-border p-8 text-center shadow-2xs">
            <CardContent className="p-0">
              <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-pink-50 text-primary dark:bg-primary/15">
                <Clock aria-hidden="true" className="size-6" />
              </div>
              <p className="text-sm font-bold text-foreground">No hay clases este día</p>
            </CardContent>
          </Card>
        ) : (
          clases.map((horario) => <ClaseDelDia key={horario.id_horario} horario={horario} />)
        )}
      </div>
    </div>
  );
}
