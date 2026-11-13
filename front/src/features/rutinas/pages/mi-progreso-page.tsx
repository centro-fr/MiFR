import { useMemo, useState } from "react";
import { ChevronDown, Info } from "lucide-react";
import { OwnerLayout } from "@/components/layout/owner-layout";
import { AvisoVacio, CAJA } from "@/components/movil/piezas";
import { Skeleton } from "@/components/ui/skeleton";
import { GraficoEvolucion } from "@/features/rutinas/components/grafico-evolucion";
import { MiniaturaEjercicio } from "@/features/rutinas/components/miniatura-ejercicio";
import { ErrorDeCarga } from "@/features/rutinas/components/tarjeta";
import { resolverGifUrl } from "@/features/rutinas/data/catalogo-ejercicios";
import { useAlumnoElegido } from "@/features/portal-alumno/hooks/use-alumno-elegido";
import { usePlanElegido } from "@/features/portal-alumno/hooks/use-plan-elegido";
import { useMedicionesDeAlumno, useNombresDeProfesoras, useRutinasDeAlumno } from "@/features/rutinas/hooks/use-rutinas";
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
import { cn } from "@/utils/cn";

// US-28: el alumno consulta sus rutinas (la vigente y las anteriores) y su progreso;
// el tutor, los de sus menores. Solo lectura: lo carga la profesora desde la ficha (US-27).

function diaYMes(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  return `${dia}/${mes}`;
}

function detalleDeLaRutina(rutina: Rutina): string {
  const periodo = rutina.hasta ? `del ${diaYMes(rutina.desde)} al ${diaYMes(rutina.hasta)}` : `desde el ${diaYMes(rutina.desde)}`;
  return `${rutina.vigente ? "Vigente · " : ""}${periodo.charAt(0).toLocaleUpperCase("es")}${periodo.slice(1)}`;
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
              return (
                <li key={`${ejercicio.nombre}-${indice}`} className="flex items-center gap-3 border-t border-border py-2.5">
                  <MiniaturaEjercicio nombre={ejercicio.nombre} gifUrl={resolverGifUrl(ejercicio.nombre)} className="size-13" />
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

/** Título de la pantalla, arriba de la grilla para que la rutina y el progreso arranquen a la misma altura. */
function EncabezadoRutina({ alumno }: { alumno: AlumnoConsultable }) {
  const consulta = useRutinasDeAlumno(alumno.id, true);
  const nombres = useNombresDeProfesoras();
  const vigente = consulta.data?.find((rutina) => rutina.vigente);
  const autora = vigente && nombres.get(vigente.idProfesora);
  return (
    <div>
      <h1 className="text-[22px] leading-7 font-extrabold tracking-tight md:text-2xl md:font-black xl:text-3xl">
        {alumno.propio ? "Tu rutina" : `Rutina de ${alumno.nombre}`}
      </h1>
      {autora && <p className="mt-0.5 text-sm text-muted-foreground">La armó {autora}</p>}
    </div>
  );
}

function MisRutinas({ alumno, idInscripcion }: { alumno: AlumnoConsultable; idInscripcion?: number | null }) {
  const consulta = useRutinasDeAlumno(alumno.id, true, idInscripcion);
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
  return (
    <div className="flex min-w-0 flex-col gap-4">
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
    </div>
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

function Aviso({ children }: { children: string }) {
  return (
    <p className={cn(CAJA, "flex items-start gap-2 p-4 text-sm")}>
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
      {children}
    </p>
  );
}

function Contenido() {
  const { consulta, elegido } = useAlumnoElegido();
  const { elegido: planElegido } = usePlanElegido();
  const idInscripcion = planElegido?.id_inscripcion ?? null;

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

  if (!elegido) return <Aviso>No encontramos una ficha de alumno vinculada a tu cuenta. Consultá en el centro.</Aviso>;

  return (
    <>
      {elegido.dadoDeBaja ? (
        <Aviso>
          {elegido.propio
            ? "Tu inscripción está dada de baja: ya no podés consultar tu rutina ni tu progreso."
            : `La inscripción de ${elegido.nombre} está dada de baja: ya no se puede consultar su rutina ni su progreso.`}
        </Aviso>
      ) : (
        // La key reinicia las consultas y el estado de las rutinas al cambiar de menor. Con lugar, la
        // rutina a la izquierda y el progreso al costado.
        <div key={`${elegido.id}-${idInscripcion ?? "sin-plan"}`} className="flex flex-col gap-4">
          <EncabezadoRutina alumno={elegido} />
          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <MisRutinas alumno={elegido} idInscripcion={idInscripcion} />
            <MiProgreso alumno={elegido} />
          </div>
        </div>
      )}
    </>
  );
}

export function MiProgresoPage() {
  return (
    <OwnerLayout>
      <div className="flex w-full min-w-0 flex-col gap-4">
        <Contenido />
      </div>
    </OwnerLayout>
  );
}
