import { useState } from "react";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { clasesDe, diaInicial, diasConClases, horaDesdeApi, turnoDe, type Turno } from "@/features/publico/utils/tablero";
import { cn } from "@/utils/cn";
import { Lugares } from "./tarjeta-horario-publico";

// En el celular, un día por vez (empieza en hoy o en el próximo día con clases) y sus clases en una
// lista compacta por turno: hora, actividad, profesora y lugares en un solo renglón.

function ClaseDelDia({ horario }: { horario: HorarioPublico }) {
  const desde = horaDesdeApi(horario.hora_inicio);
  const hasta = horaDesdeApi(horario.hora_fin);
  return (
    <li
      aria-label={`${horario.actividad.nombre}, de ${desde} a ${hasta}`}
      className="flex items-center gap-3 px-4 py-2.5"
    >
      <span className="w-12 shrink-0 text-base font-extrabold text-foreground">{desde}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold leading-tight text-foreground">{horario.actividad.nombre}</p>
        <p className="truncate text-sm text-muted-foreground">
          {horario.profesora.nombre} {horario.profesora.apellido}
        </p>
      </div>
      <Lugares horario={horario} className="text-sm" />
    </li>
  );
}

function agruparPorTurno(clases: HorarioPublico[]): [Turno, HorarioPublico[]][] {
  const grupos = new Map<Turno, HorarioPublico[]>();
  for (const clase of clases) {
    const turno = turnoDe(horaDesdeApi(clase.hora_inicio));
    grupos.set(turno, [...(grupos.get(turno) ?? []), clase]);
  }
  return [...grupos];
}

export function CronogramaPublicoMobile({ horarios }: { horarios: HorarioPublico[] }) {
  const dias = diasConClases(horarios);
  const [diaElegido, setDiaElegido] = useState(() => diaInicial(new Date(), dias));
  const elegido = dias.find(({ numero }) => numero === diaElegido) ?? dias[0];

  return (
    <div className="flex flex-col gap-4">
      <div
        role="group"
        aria-label="Elegí el día"
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${dias.length}, minmax(0, 1fr))` }}
      >
        {dias.map(({ numero, nombre, corto }) => (
          <button
            key={numero}
            type="button"
            aria-pressed={numero === elegido.numero}
            aria-label={nombre}
            onClick={() => setDiaElegido(numero)}
            className={cn(
              "min-h-[44px] rounded-xl text-sm font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              numero === elegido.numero
                ? "bg-primary text-primary-foreground shadow-brand-glow"
                : "bg-card text-foreground ring-1 ring-border hover:bg-secondary",
            )}
          >
            {corto}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <h3 className="bg-dark px-4 py-3 text-sm font-bold uppercase tracking-wider text-white">{elegido.nombre}</h3>
        {agruparPorTurno(clasesDe(horarios, elegido.numero)).map(([turno, clases]) => (
          <section key={turno} aria-label={turno}>
            <p className="bg-primary/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-primary dark:bg-primary/20">
              {turno}
            </p>
            <ul className="divide-y divide-border">
              {clases.map((horario) => (
                <ClaseDelDia key={horario.id_horario} horario={horario} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
