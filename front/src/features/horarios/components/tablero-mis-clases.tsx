import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { useClasesAsistencia } from "@/features/asistencia/hooks/use-asistencia";
import { sumarDias } from "@/features/asistencia/utils/formato-clase";
import { diasDeLaSemana, lunesDeLaSemana, rangoDeLosDias } from "@/features/asistencia/utils/semana";
import { useCronogramaProfesor } from "@/features/horarios/hooks/use-cronograma-profesor";
import { armarTablero, type BloqueDeClase } from "@/features/horarios/utils/tablero-semanal";
import { useMinutoActual } from "@/hooks/use-minuto-actual";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";

// US-04 y US-20: "Mis clases" de la profesora en escritorio. Tablero de la semana (filas por hora,
// columnas por día) con su cronograma; las clases de hoy llevan a su asistencia. En el celular se usa
// SemanaDeClases.

const ALTO_FILA = 72;

const COLORES = {
  grupal: "bg-violet-50 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
  personalizada: "bg-pink-50 text-primary-dark dark:bg-primary/15 dark:text-pink-200",
};

function ContenidoBloque({ bloque }: { bloque: BloqueDeClase }) {
  return (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <span className={cn("truncate text-[13px] leading-[18px] font-bold", bloque.cancelada && "line-through")}>{bloque.actividad}</span>
        {bloque.ahora && <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Ahora</span>}
      </span>
      <span className="flex justify-between gap-1.5 text-xs text-slate-600 tabular-nums dark:text-slate-300">
        <span>{bloque.rango}</span>
        <span>{bloque.ocupacion}</span>
      </span>
    </>
  );
}

function Bloque({ bloque }: { bloque: BloqueDeClase }) {
  const clases = cn(
    "m-1 flex flex-col justify-between rounded-lg border px-2.5 py-2",
    bloque.grupal ? COLORES.grupal : COLORES.personalizada,
    bloque.ahora ? "border-emerald-500" : "border-transparent",
    bloque.pasada && "opacity-50",
  );
  const estilo = { gridColumn: bloque.columna + 2, gridRow: `${bloque.fila + 2} / span ${bloque.filas}` };
  if (bloque.idClase !== null) {
    return (
      <Link
        to={`/app/hoy/${bloque.idClase}`}
        aria-label={`${bloque.aria}. ${bloque.ahora ? "Tomar asistencia" : "Ver asistencia"}`}
        style={estilo}
        className={cn(clases, "hover:ring-2 hover:ring-primary/30")}
      >
        <ContenidoBloque bloque={bloque} />
      </Link>
    );
  }
  return (
    <div role="group" aria-label={bloque.aria} style={estilo} className={clases}>
      <ContenidoBloque bloque={bloque} />
    </div>
  );
}

function NavegacionSemana({ onMover, onHoy }: { onMover: (semanas: number) => void; onHoy: () => void }) {
  const boton = "flex size-9 items-center justify-center text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5";
  return (
    <div role="group" aria-label="Cambiar de semana" className="flex items-center rounded-lg border border-slate-300 bg-card dark:border-slate-700">
      <button type="button" aria-label="Semana anterior" onClick={() => onMover(-1)} className={cn(boton, "rounded-l-lg")}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        onClick={onHoy}
        className="h-9 border-x border-slate-200 px-2.5 text-[13px] font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-white/5"
      >
        Hoy
      </button>
      <button type="button" aria-label="Semana siguiente" onClick={() => onMover(1)} className={cn(boton, "rounded-r-lg")}>
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function BotonTomarAsistencia({ idClase }: { idClase: number | null }) {
  const clases = "flex h-9.5 items-center rounded-lg px-4 text-sm font-bold text-white";
  if (idClase === null) {
    return (
      <button type="button" disabled title="Se habilita durante el horario de tu clase" className={cn(clases, "cursor-not-allowed bg-primary/50")}>
        Tomar asistencia
      </button>
    );
  }
  return (
    <Link to={`/app/hoy/${idClase}`} className={cn(clases, "bg-primary hover:bg-primary-dark")}>
      Tomar asistencia
    </Link>
  );
}

export function TableroMisClases({ idProfesora }: { idProfesora: string }) {
  const hoy = fechaActualArgentina();
  const ahora = useMinutoActual();
  const [lunes, setLunes] = useState(() => lunesDeLaSemana(hoy));
  const cronograma = useCronogramaProfesor(idProfesora);
  const consultaHoy = useClasesAsistencia();

  const clasesDeHoy = useMemo(
    () => (consultaHoy.data ?? []).filter((clase) => clase.id_prof_dictante === Number(idProfesora)),
    [consultaHoy.data, idProfesora],
  );
  const tablero = armarTablero({ horarios: cronograma.horarios, semana: diasDeLaSemana(lunes), hoy, clasesDeHoy, ahora });
  const enCurso = tablero.bloques.find((bloque) => bloque.ahora && bloque.idClase !== null);

  return (
    <div className="flex w-full min-w-0 flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-[26px] leading-8 font-extrabold tracking-tight">Mis clases</h1>
          <p className="mt-1 text-sm text-muted-foreground">{rangoDeLosDias(tablero.dias)}</p>
        </div>
        <div className="flex items-center gap-2">
          <NavegacionSemana onMover={(semanas) => setLunes((fecha) => sumarDias(fecha, semanas * 7))} onHoy={() => setLunes(lunesDeLaSemana(hoy))} />
          <BotonTomarAsistencia idClase={enCurso?.idClase ?? null} />
        </div>
      </div>

      {cronograma.cargando ? (
        <TablaSkeleton ariaLabel="Cargando tus clases de la semana" filas={5} />
      ) : cronograma.error ? (
        <EstadoErrorCarga
          mensaje={mensajeDeErrorApi(cronograma.error, "No se pudieron cargar tus clases.")}
          onReintentar={() => void cronograma.reintentar()}
        />
      ) : tablero.horas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-card px-4 py-10 text-center text-sm text-muted-foreground dark:border-slate-700">
          No tenés clases asignadas. Cuando la propietaria te asigne horarios, van a aparecer acá.
        </p>
      ) : (
        <section aria-label="Horarios de la semana" className="overflow-x-auto rounded-xl border border-border bg-card">
          <div
            className="grid min-w-[760px]"
            style={{
              gridTemplateColumns: `64px repeat(${tablero.dias.length}, minmax(0, 1fr))`,
              gridTemplateRows: `48px repeat(${tablero.horas.length}, ${ALTO_FILA}px)`,
            }}
          >
            <div className="border-b border-border" style={{ gridColumn: 1, gridRow: 1 }} />
            {tablero.dias.map((dia, indice) => (
              <div
                key={dia.fecha}
                style={{ gridColumn: indice + 2, gridRow: 1 }}
                className={cn(
                  "flex items-center justify-center gap-1.5 border-b border-l border-border text-[13px]",
                  dia.fecha === hoy ? "text-primary-dark dark:text-pink-300" : "text-slate-700 dark:text-slate-300",
                )}
              >
                <span className="font-semibold">{dia.corto}</span>
                <span className="font-extrabold tabular-nums">{dia.numero}</span>
                {dia.fecha === hoy && <span className="sr-only">(hoy)</span>}
              </div>
            ))}
            {tablero.horas.map((hora, fila) => (
              <div
                key={hora}
                style={{ gridColumn: 1, gridRow: fila + 2 }}
                className="border-b border-border pt-1.5 pr-2.5 text-right text-xs text-slate-500 tabular-nums dark:text-slate-400"
              >
                {hora}
              </div>
            ))}
            {tablero.horas.flatMap((hora, fila) =>
              tablero.dias.map((dia, columna) => (
                <div
                  key={`${hora}-${dia.fecha}`}
                  aria-hidden="true"
                  style={{ gridColumn: columna + 2, gridRow: fila + 2 }}
                  className={cn("border-b border-l border-border", dia.fecha === hoy && "bg-pink-50/50 dark:bg-primary/5")}
                />
              )),
            )}
            {tablero.bloques.map((bloque) => (
              <Bloque key={bloque.clave} bloque={bloque} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
