import type { CSSProperties } from "react";
import { temaDeModalidad } from "@/features/horarios/utils/tema-horario";
import type { HorarioPublico } from "@/features/publico/schemas/disponibilidad";
import {
  clasesDelDia,
  DIAS_DEL_CENTRO,
  franjasHorarias,
  horaDesdeApi,
  minutosDeHora,
  minutosDesdeApi,
} from "@/features/publico/utils/tablero";
import { BadgeProfesora, PildoraLugares } from "./tarjeta-horario-publico";

// La misma grilla que el cronograma de la propietaria (CronogramaGridDesktop): una fila por hora y
// cada clase ubicada y estirada según su horario. Es solo de consulta: no se arrastra ni se edita.
const ALTO_FRANJA_PX = 104;
const COLUMNAS = "grid-cols-[128px_repeat(6,minmax(0,1fr))]";

function ClaseEnGrilla({ horario, inicioGrilla }: { horario: HorarioPublico; inicioGrilla: number }) {
  const inicio = minutosDesdeApi(horario.hora_inicio);
  const duracion = minutosDesdeApi(horario.hora_fin) - inicio;
  const tema = temaDeModalidad(horario.actividad.modalidad);
  const desde = horaDesdeApi(horario.hora_inicio);
  const hasta = horaDesdeApi(horario.hora_fin);

  return (
    <article
      aria-label={`${horario.actividad.nombre}, de ${desde} a ${hasta}`}
      className="absolute inset-x-[3px] flex flex-col justify-between overflow-hidden rounded-2xl bg-(--tema-bg) px-2.5 py-2 shadow-xs dark:bg-(--tema-bg-oscuro)"
      style={
        {
          top: `${((inicio - inicioGrilla) * ALTO_FRANJA_PX) / 60 + 2}px`,
          height: `${(duracion * ALTO_FRANJA_PX) / 60 - 4}px`,
          "--tema-bg": tema.bg,
          "--tema-bg-oscuro": tema.bgOscuro,
        } as CSSProperties
      }
    >
      <span className="whitespace-nowrap text-xs font-extrabold tracking-tight text-foreground">
        {desde} - {hasta} hs
      </span>
      <h4 className="line-clamp-2 text-sm font-black leading-tight text-foreground" title={horario.actividad.nombre}>
        {horario.actividad.nombre}
      </h4>
      <div className="flex items-center justify-between gap-1">
        <BadgeProfesora horario={horario} soloNombre className="min-w-0 px-1.5 py-0.5 text-xs" />
        <PildoraLugares horario={horario} />
      </div>
    </article>
  );
}

export function CronogramaPublicoDesktop({ horarios }: { horarios: HorarioPublico[] }) {
  const franjas = franjasHorarias(horarios);
  const inicioGrilla = minutosDeHora(franjas[0].inicio);

  return (
    <div className="w-full text-sm">
      {/* Los días y las horas son guía visual: cada día es una sección con nombre y cada clase dice su horario. */}
      <div aria-hidden="true" className={`grid ${COLUMNAS} sticky top-16 z-20 bg-slate-50/95 dark:bg-surface-low`}>
        <div
          className="flex items-center justify-center border-r border-border p-3 text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200"
        >
          Horario
        </div>
        {DIAS_DEL_CENTRO.map(({ numero, nombre }) => (
          <div
            key={numero}
            className="flex items-center justify-center border-r border-border p-3 text-sm font-bold uppercase tracking-wider text-foreground last:border-r-0"
          >
            {nombre}
          </div>
        ))}
      </div>

      <div className={`grid ${COLUMNAS}`}>
        <div aria-hidden="true" className="grid border-r border-slate-200/60 bg-slate-50/70 dark:border-white/10 dark:bg-white/5">
          {franjas.map(({ inicio, fin }) => (
            <div
              key={inicio}
              className="flex items-center justify-center whitespace-nowrap px-2 text-center text-sm font-bold text-dark dark:text-white"
              style={{ height: `${ALTO_FRANJA_PX}px` }}
            >
              {inicio} - {fin}
            </div>
          ))}
        </div>
        {DIAS_DEL_CENTRO.map(({ numero, nombre }) => (
          <section
            key={numero}
            aria-label={nombre}
            className="relative border-r border-slate-200/60 last:border-r-0 dark:border-white/10"
            style={{ height: `${franjas.length * ALTO_FRANJA_PX}px` }}
          >
            {clasesDelDia(horarios, numero).map((horario) => (
              <ClaseEnGrilla key={horario.id_horario} horario={horario} inicioGrilla={inicioGrilla} />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
