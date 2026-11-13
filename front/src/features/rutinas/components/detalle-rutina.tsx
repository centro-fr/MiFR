import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { EJERCICIOS_DATASET_ES } from "@/features/rutinas/data/ejercicios-es";
import { lineaDeLaRutina, seriesPorRepeticiones } from "@/features/rutinas/utils/formato-rutinas";
import type { DiaDeRutina, Rutina } from "@/types/rutinas";
import { fechaActualArgentina } from "@/utils/fecha";

// Cómo se lee una rutina: lo comparten la ficha (US-27) y la pantalla del alumno (US-28).

export function ContenidoDeLaRutina({ dias }: { dias: DiaDeRutina[] }) {
  return (
    <div className="flex flex-col gap-4">
      {dias.map((dia, indiceDia) => (
        <section key={`${dia.nombre}-${indiceDia}`} aria-label={dia.nombre}>
          <h4 className="text-xs font-extrabold tracking-wide text-slate-500 uppercase dark:text-slate-400">{dia.nombre}</h4>
          <ul className="mt-1 divide-y divide-slate-100 dark:divide-slate-800">
            {dia.ejercicios.map((ejercicio, indice) => {
              const gifUrl = EJERCICIOS_DATASET_ES.find(
                (e) => e.nombre.toLowerCase() === ejercicio.nombre.trim().toLowerCase(),
              )?.gif_url;

              return (
                <li key={`${ejercicio.nombre}-${indice}`} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    {gifUrl && (
                      <img
                        src={`https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${gifUrl}`}
                        alt={ejercicio.nombre}
                        loading="lazy"
                        className="size-11 rounded-lg object-cover shrink-0 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-700"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = `https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/${gifUrl}`;
                        }}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-white">{ejercicio.nombre}</p>
                      {ejercicio.notas && <p className="text-sm whitespace-pre-line text-slate-500 dark:text-slate-400">{ejercicio.notas}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-slate-900 tabular-nums dark:text-white">{seriesPorRepeticiones(ejercicio)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function RutinaVigente({ rutina, nombresDeProfesoras }: { rutina: Rutina; nombresDeProfesoras: Map<number, string> }) {
  // Sigue siendo la vigente hasta que se cargue otra: el back no la cierra sola al pasar la fecha de fin.
  const terminada = rutina.hasta !== null && rutina.hasta < fechaActualArgentina();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{rutina.nombre}</h3>
          {terminada && rutina.hasta && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200">
              Terminó el {formatearFecha(rutina.hasta)}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{lineaDeLaRutina(rutina, nombresDeProfesoras)}</p>
      </div>
      <ContenidoDeLaRutina dias={rutina.dias} />
      {rutina.observaciones && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm whitespace-pre-line text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          {rutina.observaciones}
        </p>
      )}
    </div>
  );
}
