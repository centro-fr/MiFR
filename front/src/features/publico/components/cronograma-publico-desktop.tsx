import { Fragment } from "react";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import { clasesDe, diasConClases, horasPorTurno } from "@/features/publico/utils/tablero";
import { TarjetaHorarioPublico } from "./tarjeta-horario-publico";

// La cartelera de la semana, como la que publica el centro: una fila por hora con clases, agrupadas
// por turno, y una columna por día con clases. Es una tabla de verdad: cada celda dice su día y su hora.
export function CronogramaPublicoDesktop({ horarios }: { horarios: HorarioPublico[] }) {
  const dias = diasConClases(horarios);
  const turnos = horasPorTurno(horarios);

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <table className="w-full table-fixed border-collapse">
        <caption className="sr-only">Clases de la semana por día y hora</caption>
        <thead>
          <tr className="bg-dark text-white">
            <th scope="col" className="w-24 px-4 py-3 text-left text-sm font-bold uppercase tracking-wider">
              Hora
            </th>
            {dias.map(({ numero, nombre }) => (
              <th key={numero} scope="col" className="px-2 py-3 text-sm font-bold uppercase tracking-wider">
                {nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {turnos.map(({ turno, horas }) => (
            <Fragment key={turno}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={dias.length + 1}
                  className="bg-primary/10 px-4 py-1.5 text-left text-xs font-extrabold uppercase tracking-widest text-primary dark:bg-primary/20"
                >
                  {turno}
                </th>
              </tr>
              {horas.map((hora) => (
                <tr key={hora} className="border-b border-border last:border-b-0">
                  <th scope="row" className="px-4 py-1.5 text-left align-middle text-sm font-extrabold text-foreground">
                    {hora}
                  </th>
                  {dias.map(({ numero }) => (
                    <td key={numero} className="h-16 bg-secondary/40 p-1 align-top">
                      {clasesDe(horarios, numero, hora).map((horario) => (
                        <TarjetaHorarioPublico key={horario.id_horario} horario={horario} />
                      ))}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
