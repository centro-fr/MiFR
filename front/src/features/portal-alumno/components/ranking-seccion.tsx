import { useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Share } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { InsigniaMedalla } from "@/components/insignias/insignia-medalla";
import { AvatarIniciales, AvisoVacio, CAJA, EncabezadoPantalla, FILA } from "@/components/movil/piezas";
import { EstadoErrorCarga, TablaSkeleton } from "@/components/ui/estados-pantalla";
import { nombreDelMes } from "@/features/asistencia/utils/semana";
import { TablaRanking } from "@/features/reportes/pages/ranking-reporte-page";
import { useVistaAmplia } from "@/hooks/use-mobile";
import { fechaActualArgentina } from "@/utils/fecha";
import { cn } from "@/utils/cn";
import { useInsignias } from "../hooks/use-insignias";
import { usePanelAlumno } from "../hooks/use-panel-alumno";
import { useRankingAsistencia } from "../hooks/use-ranking-asistencia";
import type { FichaInsignias } from "../schemas/insignias";
import type { RankingAsistencia } from "../schemas/ranking-asistencia";
import { etiquetaDelMes, periodoDelAnio, periodoDelMes, sumarMeses } from "../utils/mes-del-ranking";
import { tituloDelRanking } from "../utils/titulo-del-ranking";
import { DialogoCompartirRanking, type DatosParaCompartir } from "./compartir-ranking";

// US-30 y US-31: sección Ranking de la profesora y del alumno. El contenido es el mismo en el celular y en
// escritorio (título del mes, puesto, insignias, compartir, selector de mes de la profesora); solo cambia el
// formato: lista en el celular y en tablet, y la tabla del reporte en pantallas anchas.

type FilaDelRanking = RankingAsistencia["datos"][number];

function porcentaje(fila: Pick<FilaDelRanking, "porcentaje_asistencia">): number {
  return Math.round(fila.porcentaje_asistencia);
}

function Puesto({ posicion }: { posicion: number }) {
  return (
    <span
      className={cn(
        "flex w-8.5 shrink-0 items-center gap-0.5 font-extrabold tabular-nums",
        posicion === 1 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground",
      )}
    >
      {posicion === 1 && <Crown role="img" aria-label="Primer puesto" className="size-3.5 fill-amber-400 text-amber-600" />}
      {posicion}
    </span>
  );
}

function FilaRanking({ fila, resaltarBaja, etiquetaPropia }: { fila: FilaDelRanking; resaltarBaja: boolean; etiquetaPropia: string | null }) {
  const nombre = `${fila.nombre} ${fila.apellido}`;
  const baja = resaltarBaja && porcentaje(fila) < 60;
  return (
    <li aria-current={fila.es_propia || undefined} className={cn(FILA, "flex items-center gap-3 px-3.5 py-2.5", fila.es_propia && "bg-primary/8")}>
      <Puesto posicion={fila.posicion} />
      <AvatarIniciales nombre={nombre} tamano="chico" />
      <span className={cn("min-w-0 flex-1 truncate", fila.es_propia ? "font-bold" : "font-semibold")}>
        {nombre}
        {fila.es_propia && etiquetaPropia && ` (${etiquetaPropia})`}
      </span>
      <span className={cn("font-bold tabular-nums", baja && "text-red-700 dark:text-red-400")}>{porcentaje(fila)}%</span>
    </li>
  );
}

/** Celular: lista. Si el puesto del alumno quedó fuera de la página, se agrega al final para que se vea. */
function ListaRanking({ ranking, esProfesora, etiquetaPropia }: { ranking: RankingAsistencia; esProfesora: boolean; etiquetaPropia: string | null }) {
  const propia = ranking.propias[0];
  const propiaFuera = propia && !ranking.datos.some((fila) => fila.id_alumno === propia.id_alumno);
  return (
    <ol aria-label="Ranking de asistencia" className={cn(CAJA, "overflow-hidden")}>
      {ranking.datos.map((fila) => (
        <FilaRanking key={fila.id_alumno} fila={fila} resaltarBaja={esProfesora} etiquetaPropia={etiquetaPropia} />
      ))}
      {propiaFuera && <FilaRanking fila={{ ...propia, es_propia: true }} resaltarBaja={false} etiquetaPropia={etiquetaPropia} />}
    </ol>
  );
}

/** Recorre los meses; no puede pasar del mes en curso. */
export function SelectorDeMes({ mes, mesActual, onCambiar }: { mes: string; mesActual: string; onCambiar: (mes: string) => void }) {
  const boton =
    "flex size-11 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 md:size-9 dark:text-slate-200 dark:hover:bg-white/5";
  return (
    <div role="group" aria-label="Mes del ranking" className="flex w-fit items-center rounded-lg border border-slate-300 bg-card dark:border-slate-700">
      <button type="button" aria-label="Mes anterior" onClick={() => onCambiar(sumarMeses(mes, -1))} className={cn(boton, "rounded-l-lg")}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-36 border-x border-slate-200 px-3 text-center text-sm font-semibold leading-11 md:leading-9 dark:border-slate-700">
        {etiquetaDelMes(mes)}
      </span>
      <button
        type="button"
        aria-label="Mes siguiente"
        disabled={mes >= mesActual}
        onClick={() => onCambiar(sumarMeses(mes, 1))}
        className={cn(boton, "rounded-r-lg")}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/** Recorre los años; no puede pasar del año en curso. */
export function SelectorDeAnio({ anio, anioActual, onCambiar }: { anio: number; anioActual: number; onCambiar: (anio: number) => void }) {
  const boton =
    "flex size-11 items-center justify-center text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 md:size-9 dark:text-slate-200 dark:hover:bg-white/5";
  return (
    <div role="group" aria-label="Año del ranking" className="flex w-fit items-center rounded-lg border border-slate-300 bg-card dark:border-slate-700">
      <button type="button" aria-label="Año anterior" onClick={() => onCambiar(anio - 1)} className={cn(boton, "rounded-l-lg")}>
        <ChevronLeft aria-hidden="true" className="size-4" />
      </button>
      <span aria-live="polite" className="min-w-36 border-x border-slate-200 px-3 text-center text-sm font-semibold leading-11 md:leading-9 dark:border-slate-700">
        {anio}
      </span>
      <button
        type="button"
        aria-label="Año siguiente"
        disabled={anio >= anioActual}
        onClick={() => onCambiar(anio + 1)}
        className={cn(boton, "rounded-r-lg")}
      >
        <ChevronRight aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

function TarjetaInsignia({ insignia }: { insignia: FichaInsignias["insignias"][number] }) {
  const detalle = insignia.obtenida
    ? (insignia.descripcion ?? "Obtenida")
    : insignia.progreso
      ? `${insignia.progreso.actual} de ${insignia.progreso.umbral}`
      : (insignia.descripcion ?? "Todavía no la obtuviste");
  return (
    <li className={cn(CAJA, "flex flex-col items-center gap-1.5 px-2 pt-3.5 pb-3 text-center", !insignia.obtenida && "opacity-85")}>
      <InsigniaMedalla tipo={insignia.tipo} bloqueada={!insignia.obtenida} umbral={insignia.valor_umbral} tamano={44} />
      <span className="text-[13px] leading-4 font-bold">{insignia.nombre}</span>
      <span className="text-xs text-muted-foreground">{detalle}</span>
      <span className="sr-only">{insignia.obtenida ? "Obtenida" : "Todavía no obtenida"}</span>
    </li>
  );
}

function MisInsignias({ alumno }: { alumno: AlumnoVisto }) {
  const panel = usePanelAlumno();
  const consulta = useInsignias(panel.data?.id_alumno);
  if (panel.isError || consulta.isError) {
    return (
      <EstadoErrorCarga
        mensaje={mensajeDeErrorApi(panel.error ?? consulta.error, "No se pudieron cargar tus insignias.")}
        reintentando={panel.isFetching || consulta.isFetching}
        onReintentar={() => void (panel.isError ? panel.refetch() : consulta.refetch())}
      />
    );
  }
  if (!consulta.data) return <TablaSkeleton ariaLabel="Cargando tus insignias" filas={2} />;
  return (
    <section aria-labelledby="titulo-insignias" className="flex flex-col gap-2">
      <h2 id="titulo-insignias" className="text-base font-bold">
        {alumno.propio ? "Tus insignias" : `Insignias de ${alumno.nombre}`}
      </h2>
      <ul className="grid grid-cols-3 gap-2 xl:grid-cols-6">
        {consulta.data.insignias.map((insignia) => (
          <TarjetaInsignia key={insignia.codigo} insignia={insignia} />
        ))}
      </ul>
    </section>
  );
}

function periodoLargo(ranking: RankingAsistencia): string {
  const fecha = ranking.periodo.desde.slice(0, 10);
  const mes = nombreDelMes(fecha);
  return `${mes.charAt(0).toLocaleUpperCase("es")}${mes.slice(1)} ${fecha.slice(0, 4)}`;
}

function datosParaCompartir(propia: FilaDelRanking, ranking: RankingAsistencia): DatosParaCompartir {
  return {
    nombre: `${propia.nombre} ${propia.apellido}`,
    posicion: propia.posicion,
    porcentaje: porcentaje(propia),
    asistidas: propia.clases_asistidas,
    previstas: propia.clases_previstas,
    racha: propia.racha_actual,
    periodo: periodoLargo(ranking),
    insignias: propia.insignias,
  };
}

function BotonCompartir({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={onClick}
      className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-slate-400 bg-card px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-white/5"
    >
      <Share aria-hidden="true" className="size-4" />
      Compartir
    </button>
  );
}

/** De quién es el ranking que se mira: el alumno de la sesión o el menor que eligió el tutor. */
export interface AlumnoVisto {
  id: number;
  nombre: string;
  propio: boolean;
}

function subtitulo(ranking: RankingAsistencia | undefined, alumno: AlumnoVisto | undefined): string | undefined {
  if (!alumno) return "Asistencia de tus alumnos";
  if (!ranking) return undefined;
  const propia = ranking.propias[0];
  if (alumno.propio) {
    return propia ? `Vas ${propia.posicion}.º con ${porcentaje(propia)}% de asistencia` : "Todavía no entrás en el ranking";
  }
  return propia ? `${alumno.nombre} va ${propia.posicion}.º con ${porcentaje(propia)}% de asistencia` : `${alumno.nombre} todavía no entra en el ranking`;
}

/**
 * Al tutor el back le marca como propios a todos sus menores: se deja marcado solo el que está mirando, para
 * resaltarlo, ubicar su puesto y compartirlo.
 */
function soloDelAlumno(ranking: RankingAsistencia, alumno: AlumnoVisto): RankingAsistencia {
  return {
    ...ranking,
    datos: ranking.datos.map((fila) => ({ ...fila, es_propia: fila.id_alumno === alumno.id })),
    propias: ranking.propias.filter((fila) => fila.id_alumno === alumno.id),
  };
}

/** `alumno`: a quién se mira en el portal del alumno; sin él, es el ranking de la profesora. */
export function RankingSeccion({ alumno }: { alumno?: AlumnoVisto }) {
  const esProfesora = alumno === undefined;
  const vistaAmplia = useVistaAmplia();
  const hoy = fechaActualArgentina();
  const anioActual = Number(hoy.slice(0, 4));
  const [tipoRanking, setTipoRanking] = useState<"mensual" | "anual">("mensual");
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const [anio, setAnio] = useState(() => anioActual);
  const [compartiendo, setCompartiendo] = useState(false);
  const filtroPeriodo = tipoRanking === "mensual" ? periodoDelMes(mes, hoy) : periodoDelAnio(String(anio), hoy);
  const consulta = useRankingAsistencia(filtroPeriodo);
  const ranking = consulta.data && alumno ? soloDelAlumno(consulta.data, alumno) : consulta.data;
  const propia = esProfesora ? undefined : ranking?.propias[0];
  const etiquetaPropia = alumno?.propio ? "vos" : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <EncabezadoPantalla
        titulo={ranking ? tituloDelRanking(ranking.periodo, hoy) : "Ranking"}
        detalle={subtitulo(ranking, alumno)}
        accion={propia && <BotonCompartir onClick={() => setCompartiendo(true)} />}
      />

      <div className="flex flex-wrap items-center gap-3">
        <div role="group" aria-label="Tipo de ranking" className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            aria-pressed={tipoRanking === "mensual"}
            onClick={() => setTipoRanking("mensual")}
            className={cn(
              "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors",
              tipoRanking === "mensual"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            Mensual
          </button>
          <button
            type="button"
            aria-pressed={tipoRanking === "anual"}
            onClick={() => setTipoRanking("anual")}
            className={cn(
              "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors",
              tipoRanking === "anual"
                ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
            )}
          >
            Anual
          </button>
        </div>

        {tipoRanking === "mensual" && (
          <SelectorDeMes mes={mes} mesActual={hoy.slice(0, 7)} onCambiar={setMes} />
        )}
        {tipoRanking === "anual" && (
          <SelectorDeAnio anio={anio} anioActual={anioActual} onCambiar={setAnio} />
        )}
      </div>

      {consulta.isPending ? (
        <TablaSkeleton ariaLabel="Cargando el ranking" filas={6} />
      ) : !ranking ? (
        <EstadoErrorCarga
          titulo="No se pudo cargar el ranking"
          mensaje={mensajeDeErrorApi(consulta.error, "Probá de nuevo en un momento.")}
          reintentando={consulta.isFetching}
          onReintentar={() => void consulta.refetch()}
        />
      ) : ranking.datos.length === 0 ? (
        <AvisoVacio>Todavía no hay ranking: se necesitan al menos {ranking.minimo_clases} clases previstas en el período.</AvisoVacio>
      ) : vistaAmplia ? (
        <TablaRanking ranking={ranking} conCriterio={false} etiquetaPropia={etiquetaPropia} />
      ) : (
        <ListaRanking ranking={ranking} esProfesora={esProfesora} etiquetaPropia={etiquetaPropia} />
      )}

      {alumno && <MisInsignias alumno={alumno} />}

      {ranking && propia && (
        <DialogoCompartirRanking datos={datosParaCompartir(propia, ranking)} abierto={compartiendo} onCerrar={() => setCompartiendo(false)} />
      )}
    </div>
  );
}
