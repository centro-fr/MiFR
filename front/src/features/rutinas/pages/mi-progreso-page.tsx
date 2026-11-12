import { useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { AvisoVacio, CAJA } from "@/components/movil/piezas";
import { Skeleton } from "@/components/ui/skeleton";
import { GraficoEvolucion } from "@/features/rutinas/components/grafico-evolucion";
import { ErrorDeCarga } from "@/features/rutinas/components/tarjeta";
import { resolverGifUrl } from "@/features/rutinas/data/catalogo-ejercicios";
import { useMedicionesDeAlumno, useMisAlumnos, useNombresDeProfesoras, useRutinasDeAlumno } from "@/features/rutinas/hooks/use-rutinas";
import { MEDIDAS } from "@/features/rutinas/schemas/medidas";
import {
  describirDiferencia,
  etiquetaDeMedida,
  evolucionPorMedida,
  formatearMedida,
  serieDeLaMedida,
  seriesPorRepeticiones,
} from "@/features/rutinas/utils/formato-rutinas";
import type { AlumnoConsultable, Rutina } from "@/types/rutinas";
import { MiProgresoEscritorio } from "@/features/rutinas/components/mi-progreso-escritorio";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/utils/cn";

// US-28 con el diseño mobile: el alumno consulta sus rutinas (la vigente y las anteriores) y su progreso;
// el tutor, los de sus menores. Solo lectura: lo carga la profesora desde la ficha (US-27).

function diaYMes(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

function detalleDeLaRutina(rutina: Rutina): string {
  const periodo = rutina.hasta ? `del ${diaYMes(rutina.desde)} al ${diaYMes(rutina.hasta)}` : `desde el ${diaYMes(rutina.desde)}`;
  const dias = `${rutina.dias.length} ${rutina.dias.length === 1 ? "día" : "días"}`;
  return `${rutina.vigente ? "Vigente · " : ""}${periodo.charAt(0).toLocaleUpperCase("es")}${periodo.slice(1)} · ${dias}`;
}

/** La vigente primero y después las anteriores, de la más reciente a la más vieja. */
function enOrden(rutinas: Rutina[]): Rutina[] {
  return [...rutinas].sort((a, b) => Number(b.vigente) - Number(a.vigente) || b.desde.localeCompare(a.desde));
}

function etiquetaDelDia(nombre: string, indice: number): string {
  return /^d[ií]a\b/iu.test(nombre) ? nombre : `Día ${indice + 1} · ${nombre}`;
}

function RutinaPlegable({ rutina, abierta, onAlternar }: { rutina: Rutina; abierta: boolean; onAlternar: () => void }) {
  const [diaElegido, setDiaElegido] = useState(0);
  const dia = rutina.dias[diaElegido] ?? rutina.dias[0];
  return (
    <section aria-label={rutina.nombre} className={cn(CAJA, "overflow-hidden")}>
      <button
        type="button"
        aria-expanded={abierta}
        onClick={onAlternar}
        className="flex w-full items-center gap-3 py-3.5 pr-3 pl-4 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-base leading-[22px] font-bold">{rutina.nombre}</span>
          <span className="block text-xs text-muted-foreground">{detalleDeLaRutina(rutina)}</span>
        </span>
        <ChevronDown aria-hidden="true" className={cn("size-5 shrink-0 text-muted-foreground transition-transform", abierta && "rotate-180")} />
      </button>
      {abierta && dia && (
        <div className="px-4 pb-1">
          <div role="tablist" aria-label={`Días de ${rutina.nombre}`} className="flex gap-1.5 overflow-x-auto pb-2.5">
            {rutina.dias.map((d, indice) => {
              const elegido = indice === diaElegido;
              return (
                <button
                  key={`${d.nombre}-${indice}`}
                  type="button"
                  role="tab"
                  aria-selected={elegido}
                  onClick={() => setDiaElegido(indice)}
                  className={cn(
                    "h-8.5 shrink-0 rounded-full border px-3 text-[13px] font-bold whitespace-nowrap",
                    elegido
                      ? "border-dark bg-dark text-white dark:border-white dark:bg-white dark:text-dark"
                      : "border-border bg-card text-slate-700 dark:text-slate-300",
                  )}
                >
                  {etiquetaDelDia(d.nombre, indice)}
                </button>
              );
            })}
          </div>
          <ol aria-label="Ejercicios">
            {dia.ejercicios.map((ejercicio, indice) => {
              const gif = resolverGifUrl(ejercicio.nombre);
              return (
                <li key={`${ejercicio.nombre}-${indice}`} className="flex items-center gap-3 border-t border-border py-2.5">
                  {gif ? (
                    <img
                      src={gif}
                      alt={ejercicio.nombre}
                      loading="lazy"
                      className="size-13 shrink-0 rounded-lg border border-border bg-white object-cover"
                    />
                  ) : (
                    <span aria-hidden="true" className="size-13 shrink-0 rounded-lg border border-border bg-slate-50 dark:bg-white/5" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold">{ejercicio.nombre}</span>
                    {ejercicio.notas && <span className="block text-xs text-muted-foreground">{ejercicio.notas}</span>}
                  </span>
                  <span className="shrink-0 font-extrabold whitespace-nowrap tabular-nums">{seriesPorRepeticiones(ejercicio)}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}

function MisRutinas({ alumno }: { alumno: AlumnoConsultable }) {
  const consulta = useRutinasDeAlumno(alumno.id, true);
  const nombres = useNombresDeProfesoras();
  const rutinas = useMemo(() => enOrden(consulta.data ?? []), [consulta.data]);
  const [abierta, setAbierta] = useState<number | null | undefined>(undefined);
  // Al entrar se ve abierta la primera (la vigente, si hay).
  const idAbierta = abierta === undefined ? rutinas[0]?.id : abierta;

  if (consulta.isPending) return <Skeleton className="h-48 rounded-xl" />;
  if (consulta.isError) {
    return (
      <ErrorDeCarga
        error={consulta.error}
        mensaje="No se pudo cargar la rutina."
        reintentando={consulta.isFetching}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }
  const vigente = rutinas.find((rutina) => rutina.vigente);
  const autora = vigente && nombres.get(vigente.idProfesora);
  const titulo = alumno.propio ? "Tu rutina" : `Rutina de ${alumno.nombre}`;

  return (
    <>
      <div>
        <h1 className="text-[22px] leading-7 font-extrabold tracking-tight">{titulo}</h1>
        {autora && <p className="mt-0.5 text-sm text-muted-foreground">La armó {autora}</p>}
      </div>
      {rutinas.length === 0 ? (
        <AvisoVacio>
          {alumno.propio ? "Tu profesora todavía no cargó una rutina." : `Su profesora todavía no le cargó una rutina a ${alumno.nombre}.`}
        </AvisoVacio>
      ) : (
        rutinas.map((rutina, indice) => (
          <div key={rutina.id} className="flex flex-col gap-2">
            {!rutina.vigente && (indice === 0 || rutinas[indice - 1].vigente) && (
              <h2 className="mt-2 text-base font-bold">Rutinas anteriores</h2>
            )}
            <RutinaPlegable
              rutina={rutina}
              abierta={rutina.id === idAbierta}
              onAlternar={() => setAbierta(rutina.id === idAbierta ? null : rutina.id)}
            />
          </div>
        ))
      )}
    </>
  );
}

function MiProgreso({ alumno }: { alumno: AlumnoConsultable }) {
  const consulta = useMedicionesDeAlumno(alumno.id, true);
  const mediciones = useMemo(() => consulta.data ?? [], [consulta.data]);
  const evolucion = useMemo(() => evolucionPorMedida(mediciones), [mediciones]);
  const pesos = useMemo(() => serieDeLaMedida(mediciones, "PESO"), [mediciones]);

  function contenido() {
    if (consulta.isPending) return <Skeleton className="h-32 rounded-xl" />;
    if (consulta.isError) {
      return (
        <ErrorDeCarga
          error={consulta.error}
          mensaje="No se pudo cargar el progreso."
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      );
    }
    if (mediciones.length === 0) return <p className="text-sm text-muted-foreground">Todavía no hay registros de progreso.</p>;
    return (
      <>
        <dl className="grid grid-cols-2 gap-2">
          {evolucion.map((medida) => {
            const diferencia = describirDiferencia(medida);
            return (
              <div key={medida.codigo} className="rounded-[10px] bg-bg-light px-3 py-2.5 dark:bg-white/5">
                <dt className="text-xs font-semibold text-muted-foreground">{etiquetaDeMedida(medida.codigo)}</dt>
                <dd className="text-lg leading-[26px] font-extrabold tabular-nums">{formatearMedida(medida.actual, medida.unidad)}</dd>
                {diferencia && <dd className="text-xs text-slate-600 dark:text-slate-300">{diferencia}</dd>}
              </div>
            );
          })}
        </dl>
        {pesos.length >= 2 && <GraficoEvolucion puntos={pesos} etiqueta={MEDIDAS.PESO.etiqueta} unidad={MEDIDAS.PESO.unidad} />}
      </>
    );
  }

  return (
    <section aria-labelledby="titulo-progreso" className={cn(CAJA, "flex flex-col gap-3 p-4")}>
      <h2 id="titulo-progreso" className="text-base font-bold">
        {alumno.propio ? "Tu progreso" : `Progreso de ${alumno.nombre}`}
      </h2>
      {contenido()}
    </section>
  );
}

/** El tutor con más de un menor elige de quién ver la rutina. */
function SelectorDeAlumno({ alumnos, elegido, onElegir }: { alumnos: AlumnoConsultable[]; elegido: number; onElegir: (id: number) => void }) {
  return (
    <div role="group" aria-label="Ver la rutina de" className="flex flex-wrap gap-2">
      {alumnos.map((alumno) => (
        <button
          key={alumno.id}
          type="button"
          aria-pressed={alumno.id === elegido}
          onClick={() => onElegir(alumno.id)}
          className={cn(
            "min-h-11 rounded-xl border px-4 text-sm font-bold",
            alumno.id === elegido ? "border-primary bg-pink-50 text-primary-dark dark:bg-primary/15 dark:text-pink-300" : "border-border bg-card",
          )}
        >
          {alumno.nombre} {alumno.apellido}
        </button>
      ))}
    </div>
  );
}

function Aviso({ children }: { children: string }) {
  return (
    <p className={cn(CAJA, "flex items-start gap-2 p-4 text-sm")}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      {children}
    </p>
  );
}

function Contenido() {
  const consulta = useMisAlumnos();
  const [idElegido, setIdElegido] = useState<number | null>(null);

  if (consulta.isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (consulta.isError) {
    return (
      <ErrorDeCarga
        error={consulta.error}
        mensaje="No se pudieron cargar tus datos."
        reintentando={consulta.isFetching}
        onReintentar={() => void consulta.refetch()}
      />
    );
  }

  const alumnos = consulta.data;
  const elegido = alumnos.find((alumno) => alumno.id === idElegido) ?? alumnos[0];
  if (!elegido) return <Aviso>No encontramos una ficha de alumno vinculada a tu cuenta. Consultá en el centro.</Aviso>;

  return (
    <>
      {alumnos.length > 1 && <SelectorDeAlumno alumnos={alumnos} elegido={elegido.id} onElegir={setIdElegido} />}
      {elegido.dadoDeBaja ? (
        <Aviso>
          {elegido.propio
            ? "Tu inscripción está dada de baja: ya no podés consultar tu rutina ni tu progreso."
            : `La inscripción de ${elegido.nombre} está dada de baja: ya no se puede consultar su rutina ni su progreso.`}
        </Aviso>
      ) : (
        // La key reinicia las consultas y el estado de las rutinas al cambiar de menor.
        <div key={elegido.id} className="flex flex-col gap-4">
          <MisRutinas alumno={elegido} />
          <MiProgreso alumno={elegido} />
        </div>
      )}
    </>
  );
}

export function MiProgresoPage() {
  const esMobile = useIsMobile();
  if (!esMobile) return <MiProgresoEscritorio />;
  return (
    <OwnerLayout>
      <div className="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-4">
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
