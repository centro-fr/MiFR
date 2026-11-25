import { Lightbulb } from "lucide-react";
import { PestanasFiltro } from "@/components/ui/pestanas-filtro";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SeccionReporte, TD, TD_NUMERO, TH, TH_NUMERO } from "@/features/reportes/components/piezas-reporte";
import {
  conSigno,
  lecturaDelGrafico,
  METRICAS,
  motivosPrincipales,
  valorDelMes,
  type Metrica,
} from "@/features/reportes/utils/comparacion-anios";
import { formatearDecimal, MES_CORTO, esMesEnCurso, mesesTranscurridos } from "@/features/reportes/utils/formato-inscripciones";
import type { EstadisticasInscripciones } from "@/types/reportes";
import { cn } from "@/utils/cn";

// US-35: piezas de la pestaña Inscripciones: los años mes a mes y las bajas del año.

// El año elegido en rosa y los anteriores en grises cada vez más claros.
const COLOR_DEL_ANIO = ["bg-primary", "bg-slate-400 dark:bg-slate-500", "bg-slate-300 dark:bg-slate-600"];
const ALTO_DEL_GRAFICO = 160;

function colorDelAnio(anio: number, anioElegido: number): string {
  return COLOR_DEL_ANIO[anioElegido - anio] ?? COLOR_DEL_ANIO[2];
}

interface PropsControles {
  metrica: Metrica;
  onMetrica: (metrica: Metrica) => void;
  anios: number[];
  elegidos: number[];
  anioElegido: number;
  onAlternarAnio: (anio: number) => void;
}

function Controles({ metrica, onMetrica, anios, elegidos, anioElegido, onAlternarAnio }: PropsControles) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PestanasFiltro
        etiqueta="Qué comparar"
        opciones={(Object.keys(METRICAS) as Metrica[]).map((opcion) => ({ id: opcion, etiqueta: METRICAS[opcion].nombre }))}
        valor={metrica}
        onCambiar={onMetrica}
      />
      <div role="group" aria-label="Años" className="flex gap-1.5">
        {anios.map((anio) => {
          const activo = elegidos.includes(anio);
          return (
            <button
              key={anio}
              type="button"
              aria-pressed={activo}
              // Siempre queda al menos un año.
              disabled={activo && elegidos.length === 1}
              onClick={() => onAlternarAnio(anio)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold transition-colors",
                activo
                  ? "border-slate-400 bg-white text-slate-900 dark:border-slate-500 dark:bg-slate-900 dark:text-white"
                  : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40",
              )}
            >
              <span aria-hidden="true" className={cn("size-2.5 rounded-[3px]", colorDelAnio(anio, anioElegido), !activo && "opacity-40")} />
              {anio}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Grafico({ datos, metrica, anioElegido, hoy }: { datos: EstadisticasInscripciones[]; metrica: Metrica; anioElegido: number; hoy: string }) {
  const valores = datos.map((anio) => anio.meses.map((mes) => valorDelMes(mes, metrica, hoy)));
  const maximo = Math.max(1, ...valores.flat().map((valor) => valor ?? 0));
  const descripcion = `${METRICAS[metrica].nombre} por mes. ${datos
    .map((anio, i) => `${anio.anio}: ${anio.meses.map((mes, j) => `${mes.nombre} ${valores[i][j] ?? "sin datos"}`).join(", ")}`)
    .join(". ")}.`;
  return (
    <div role="img" aria-label={descripcion} className="overflow-x-auto">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-12 items-end gap-2 border-b border-slate-200 dark:border-slate-700" style={{ height: ALTO_DEL_GRAFICO + 24 }}>
          {MES_CORTO.map((nombre, indiceMes) => {
            const resaltado = datos.some((anio) => anio.anio === anioElegido && anio.meses[indiceMes] && esMesEnCurso(anio.meses[indiceMes], hoy));
            return (
              <div key={nombre} className={cn("flex h-full items-end justify-center gap-[3px] rounded-t-md", resaltado && "bg-pink-50 dark:bg-primary/10")}>
                {datos.map((anio, i) => {
                  const valor = valores[i][indiceMes];
                  return (
                    <div key={anio.anio} className="flex w-full max-w-4 flex-col items-center gap-0.5">
                      <span className={cn("text-[10px] font-semibold tabular-nums", anio.anio === anioElegido ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                        {valor ?? ""}
                      </span>
                      <div
                        className={cn("w-full rounded-t-[3px]", colorDelAnio(anio.anio, anioElegido))}
                        style={{ height: valor === null ? 0 : Math.max(2, Math.round((valor / maximo) * ALTO_DEL_GRAFICO)) }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div aria-hidden="true" className="mt-2 grid grid-cols-12 gap-2">
          {MES_CORTO.map((nombre) => (
            <span key={nombre} className="text-center text-xs font-medium text-muted-foreground">
              {nombre}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Tabla({ datos, metrica, anioElegido, hoy }: { datos: EstadisticasInscripciones[]; metrica: Metrica; anioElegido: number; hoy: string }) {
  const actual = datos.find(({ anio }) => anio === anioElegido);
  const previo = [...datos].reverse().find(({ anio }) => anio < anioElegido);
  const conDiferencia = actual !== undefined && previo !== undefined;
  // Más bajas que el año anterior es una mala noticia; más altas o más activos, una buena.
  const color = (diferencia: number) =>
    diferencia === 0 ? "text-muted-foreground" : (diferencia > 0) === (metrica !== "bajas") ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300";
  const transcurridos = actual ? mesesTranscurridos(actual.meses, hoy).length : 12;
  const suma = (anio: EstadisticasInscripciones) =>
    anio.meses.slice(0, transcurridos).reduce((total, mes) => total + (valorDelMes(mes, metrica, hoy) ?? 0), 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className={TH}>Mes</th>
            {datos.map(({ anio }) => (
              <th key={anio} scope="col" className={TH_NUMERO}>{anio}</th>
            ))}
            {conDiferencia && <th scope="col" className={TH_NUMERO}>{`${anioElegido} vs ${previo.anio}`}</th>}
          </tr>
        </thead>
        <tbody>
          {MES_CORTO.map((nombre, indiceMes) => {
            const delActual = actual && valorDelMes(actual.meses[indiceMes], metrica, hoy);
            const delPrevio = previo && valorDelMes(previo.meses[indiceMes], metrica, hoy);
            const diferencia = delActual != null && delPrevio != null ? delActual - delPrevio : null;
            return (
              <tr key={nombre}>
                <th scope="row" className={`${TD} text-left font-semibold text-slate-900 dark:text-white`}>{nombre}</th>
                {datos.map((anio) => {
                  const valor = valorDelMes(anio.meses[indiceMes], metrica, hoy);
                  return (
                    <td key={anio.anio} className={cn(TD_NUMERO, anio.anio === anioElegido ? "font-bold" : "text-slate-600 dark:text-slate-400")}>
                      {valor ?? "—"}
                    </td>
                  );
                })}
                {conDiferencia && <td className={cn(TD_NUMERO, "font-bold", diferencia === null ? "text-muted-foreground" : color(diferencia))}>{diferencia === null ? "—" : conSigno(diferencia)}</td>}
              </tr>
            );
          })}
          {metrica !== "activos" && (
            <tr className="bg-slate-50 dark:bg-white/5">
              <th scope="row" className={`${TD} text-left font-extrabold`}>{`Ene a ${MES_CORTO[transcurridos - 1]?.toLowerCase() ?? "dic"}`}</th>
              {datos.map((anio) => (
                <td key={anio.anio} className={cn(TD_NUMERO, "font-extrabold")}>{suma(anio)}</td>
              ))}
              {conDiferencia && <td className={cn(TD_NUMERO, "font-extrabold", color(suma(actual) - suma(previo)))}>{conSigno(suma(actual) - suma(previo))}</td>}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface PropsMesAMes extends PropsControles {
  /** Los años elegidos que ya cargaron, del más viejo al más nuevo. */
  datos: EstadisticasInscripciones[];
  cargando: boolean;
  hoy: string;
  tablaAbierta: boolean;
  onAlternarTabla: () => void;
}

export function MesAMes({ datos, cargando, hoy, tablaAbierta, onAlternarTabla, ...controles }: PropsMesAMes) {
  const lectura = cargando ? null : lecturaDelGrafico(datos, controles.metrica, hoy);
  return (
    <SeccionReporte id="titulo-comparacion-anios" titulo="Comparación entre años" descripcion={METRICAS[controles.metrica].detalle}>
      <Controles {...controles} />
      <div className="mt-5">
        {cargando ? <Skeleton aria-label="Cargando los años" className="h-48 rounded-xl" /> : <Grafico datos={datos} metrica={controles.metrica} anioElegido={controles.anioElegido} hoy={hoy} />}
      </div>
      {lectura && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">
          <Lightbulb aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>
            <strong className="font-bold text-slate-900 dark:text-white">Para tener en cuenta:</strong> {lectura}
          </span>
        </p>
      )}
      <div className="mt-3 flex justify-end">
        <Button type="button" variant="outline" aria-expanded={tablaAbierta} onClick={onAlternarTabla} className="min-h-9 rounded-lg px-3 text-sm font-semibold">
          {tablaAbierta ? "Ocultar tabla" : "Ver tabla"}
        </Button>
      </div>
      {tablaAbierta && !cargando && (
        <div className="mt-3">
          <Tabla datos={datos} metrica={controles.metrica} anioElegido={controles.anioElegido} hoy={hoy} />
        </div>
      )}
    </SeccionReporte>
  );
}

function enMeses(meses: number): string {
  return `${formatearDecimal(meses)} ${meses === 1 ? "mes" : "meses"}`;
}

function comparacionDePermanencia(actual: number | null, anterior: number | null | undefined, anio: number): string | null {
  if (actual === null || anterior === null || anterior === undefined) return null;
  const diferencia = Math.round((actual - anterior) * 10) / 10;
  if (diferencia === 0) return `Lo mismo que en ${anio}`;
  return `${enMeses(Math.abs(diferencia))} ${diferencia > 0 ? "más" : "menos"} que en ${anio}`;
}

export function BajasDelAnioSeccion({ actual, anterior }: { actual: EstadisticasInscripciones; anterior: EstadisticasInscripciones | undefined }) {
  const { motivos, permanencia } = actual.bajas;
  const total = motivos.reduce((suma, { cantidad }) => suma + cantidad, 0);
  const resumidos = motivosPrincipales(motivos);
  const mayor = Math.max(1, ...resumidos.map(({ cantidad }) => cantidad));
  const comparada = comparacionDePermanencia(permanencia.promedioMeses, anterior?.bajas.permanencia.promedioMeses, actual.anio - 1);

  return (
    <SeccionReporte
      id="titulo-bajas-del-anio"
      titulo="Bajas del año"
      descripcion={permanencia.cantidad === 0 ? `No hubo bajas en ${actual.anio}.` : `Por qué se van y cuánto se quedan · ${actual.totalBajas} ${actual.totalBajas === 1 ? "baja" : "bajas"} en ${actual.anio}`}
    >
      {permanencia.cantidad > 0 && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ul aria-label="Motivos de baja" className="grid content-start gap-3">
            {resumidos.map(({ nombre, cantidad, secundario }, indice) => (
              <li key={nombre}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white">{nombre}</span>
                  <span className="tabular-nums">
                    <strong>{cantidad}</strong>{" "}
                    <span className="text-muted-foreground">· {Math.round((cantidad / Math.max(total, 1)) * 100)} %</span>
                  </span>
                </div>
                <div aria-hidden="true" className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className={cn("h-2 rounded-full", secundario ? "bg-slate-300 dark:bg-slate-600" : indice < 2 ? "bg-primary" : "bg-pink-300 dark:bg-pink-400/70")}
                    style={{ width: `${Math.round((cantidad / mayor) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <dl className="grid content-start gap-4 border-slate-100 md:border-l md:pl-6 dark:border-slate-800">
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Se quedan en promedio</dt>
              <dd className="mt-0.5 text-2xl font-black tabular-nums">{permanencia.promedioMeses === null ? "—" : enMeses(permanencia.promedioMeses)}</dd>
              {comparada && <dd className="text-xs text-muted-foreground">{comparada}</dd>}
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-foreground">Se van en los primeros 3 meses</dt>
              <dd className="mt-0.5 text-2xl font-black text-rose-700 tabular-nums dark:text-rose-300">
                {Math.round((permanencia.primerosTresMeses / permanencia.cantidad) * 100)} %
              </dd>
              <dd className="text-xs text-muted-foreground">Conviene seguir de cerca a los alumnos nuevos</dd>
            </div>
          </dl>
        </div>
      )}
    </SeccionReporte>
  );
}
