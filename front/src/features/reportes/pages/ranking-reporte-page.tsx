import { useState } from "react";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListaInsignias } from "@/components/insignias/insignia-medalla";
import { MenuExportar } from "@/components/menu-exportar";
import { MedallaPuesto } from "@/features/portal-alumno/components/medalla-puesto";
import { SelectorDeAnio, SelectorDeMes } from "@/features/portal-alumno/components/ranking-seccion";
import { useRankingAsistencia } from "@/features/portal-alumno/hooks/use-ranking-asistencia";
import type { RankingAsistencia } from "@/features/portal-alumno/schemas/ranking-asistencia";
import { periodoDelAnio, periodoDelMes, periodoGeneral } from "@/features/portal-alumno/utils/mes-del-ranking";
import { tituloDelRanking } from "@/features/portal-alumno/utils/titulo-del-ranking";
import { PaginaReportes } from "@/features/reportes/components/pagina-reportes";
import {
  BarraPorcentaje,
  CargandoReporte,
  ErrorDelReporte,
  ReporteVacio,
  ResumenEnTarjetas,
  SeccionReporte,
  TD,
  TD_NUMERO,
  TH,
  TH_NUMERO,
} from "@/features/reportes/components/piezas-reporte";
import { TablaImprimible } from "@/features/reportes/components/tabla-imprimible";
import { useExportarTabla } from "@/features/reportes/hooks/use-exportar-tabla";
import { formatearPorcentaje } from "@/features/reportes/utils/formato-informe";
import type { TablaExportable } from "@/features/reportes/utils/tabla-exportable";
import { cn } from "@/utils/cn";
import { fechaActualArgentina } from "@/utils/fecha";

// US-30: pestaña "Ranking" de Reportes. Lo mismo que ven profesora, alumno y tutor en su sección Ranking
// (puesto, clases, asistencia y racha), en una tabla para la propietaria. El podio lleva medallas de oro,
// plata y bronce, igual que en esa sección.

type Fila = RankingAsistencia["datos"][number];

function clases(fila: Fila): string {
  return `${fila.clases_asistidas} de ${fila.clases_previstas}`;
}

function racha(fila: Fila): string {
  if (fila.racha_actual === 0) return "—";
  return `${fila.racha_actual} ${fila.racha_actual === 1 ? "clase" : "clases"}`;
}

function aTabla(ranking: RankingAsistencia, detalle: string): TablaExportable {
  return {
    titulo: "Ranking",
    detalle,
    resumen: [
      ["Participantes", String(ranking.total)],
      ["Mínimo de clases", String(ranking.minimo_clases)],
    ],
    columnas: [{ titulo: "Puesto", decimales: 0 }, { titulo: "Alumno" }, { titulo: "Clases" }, { titulo: "Asistencia %", decimales: 1 }, { titulo: "Racha actual" }],
    filas: ranking.datos.map((fila) => [fila.posicion, `${fila.nombre} ${fila.apellido}`, clases(fila), fila.porcentaje_asistencia, racha(fila)]),
    pie: "Ordenado por porcentaje de asistencia; si empatan, primero quien vino a más clases.",
    nombreArchivo: `ranking-asistencia-${ranking.periodo.desde.slice(0, 10)}`,
  };
}

/**
 * La tabla del ranking: la usa este reporte y, sola, la sección Ranking de profesora y alumno en escritorio.
 * `conCriterio`: el criterio de quién entra es para la propietaria; a los demás no se les muestra.
 */
export function TablaRanking({
  ranking,
  conCriterio = true,
  etiquetaPropia = "vos",
}: {
  ranking: RankingAsistencia;
  conCriterio?: boolean;
  /** Al lado del nombre de la fila propia; null para resaltarla sin texto (el tutor mirando a un menor). */
  etiquetaPropia?: string | null;
}) {
  const [pagina, setPagina] = useState(0);
  const TAMANO_PAGINA = 10;
  const total = ranking.datos.length;
  const paginas = Math.max(1, Math.ceil(total / TAMANO_PAGINA));
  const rangoInicio = total > 0 ? pagina * TAMANO_PAGINA + 1 : 0;
  const rangoFin = Math.min((pagina + 1) * TAMANO_PAGINA, total);
  const datosPaginados = ranking.datos.slice(pagina * TAMANO_PAGINA, (pagina + 1) * TAMANO_PAGINA);

  return (
    <SeccionReporte
      id="titulo-ranking"
      titulo={`Ranking (${ranking.total})`}
      descripcion={conCriterio ? `Solo alumnos activos con al menos ${ranking.minimo_clases} clases previstas en el período.` : undefined}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={cn(TH, "w-20")}>Puesto</th>
              <th scope="col" className={TH}>Alumno</th>
              <th scope="col" className={TH_NUMERO}>Clases</th>
              <th scope="col" className={TH_NUMERO}>Asistencia</th>
              <th scope="col" className={TH_NUMERO}>Racha actual</th>
            </tr>
          </thead>
          <tbody>
            {datosPaginados.map((fila) => (
              <tr
                key={fila.id_alumno}
                aria-current={fila.es_propia || undefined}
                className={cn(fila.posicion <= 3 && "bg-amber-50/40 dark:bg-amber-400/5", fila.es_propia && "bg-pink-50 dark:bg-primary/10")}
              >
                <td className={TD}>
                  <MedallaPuesto posicion={fila.posicion} tamanio="chico" />
                </td>
                <th scope="row" className={`${TD} text-left font-normal`}>
                  {/* Como en el diseño: las insignias de cada alumno al lado de su nombre. */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="font-semibold whitespace-nowrap text-slate-900 dark:text-white">
                      {fila.nombre} {fila.apellido}
                      {fila.es_propia && etiquetaPropia && ` (${etiquetaPropia})`}
                    </span>
                    <ListaInsignias insignias={fila.insignias} tamano={22} className="gap-1" />
                  </div>
                </th>
                <td className={`${TD_NUMERO} text-slate-700 dark:text-slate-300`}>{clases(fila)}</td>
                <td className={TD_NUMERO}>
                  <BarraPorcentaje valor={fila.porcentaje_asistencia} texto={formatearPorcentaje(fila.porcentaje_asistencia)} />
                </td>
                <td className={`${TD_NUMERO} text-slate-700 dark:text-slate-300`}>{racha(fila)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > TAMANO_PAGINA && (
        <nav
          aria-label="Paginación de ranking"
          className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row text-xs border-t border-slate-100 pt-3 dark:border-slate-800"
        >
          <p aria-live="polite" className="text-slate-500 dark:text-slate-400 font-medium">
            {rangoInicio}–{rangoFin} de {total} participantes
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pagina === 0}
              onClick={() => setPagina((actual) => Math.max(0, actual - 1))}
              className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
            >
              <ChevronLeft aria-hidden="true" className="mr-1 size-3.5" />
              Anterior
            </Button>
            <span className="px-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {pagina + 1} / {paginas}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={pagina + 1 >= paginas}
              onClick={() => setPagina((actual) => Math.min(paginas - 1, actual + 1))}
              className="h-8 min-h-0 rounded-lg border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-slate-200"
            >
              Siguiente
              <ChevronRight aria-hidden="true" className="ml-1 size-3.5" />
            </Button>
          </div>
        </nav>
      )}
    </SeccionReporte>
  );
}

export function RankingReportePage() {
  const hoy = fechaActualArgentina();
  const anioActual = Number(hoy.slice(0, 4));
  const [tipoRanking, setTipoRanking] = useState<"mensual" | "anual" | "general">("mensual");
  const [mes, setMes] = useState(() => hoy.slice(0, 7));
  const [anio, setAnio] = useState(() => anioActual);

  const filtroPeriodo =
    tipoRanking === "mensual"
      ? periodoDelMes(mes, hoy)
      : tipoRanking === "anual"
        ? periodoDelAnio(String(anio), hoy)
        : periodoGeneral(hoy);
  const consulta = useRankingAsistencia(filtroPeriodo);
  const ranking = consulta.data;
  const detalle = ranking ? tituloDelRanking(ranking.periodo, hoy) : "Ranking de asistencia";
  const { exportar, preparando, impresion } = useExportarTabla(() =>
    ranking ? Promise.resolve(aTabla(ranking, detalle)) : Promise.reject(new Error("El ranking todavía no cargó.")),
  );
  const perfectos = ranking?.datos.filter((fila) => fila.clases_asistidas === fila.clases_previstas).length ?? 0;
  const promedio = ranking && ranking.datos.length > 0 ? ranking.datos.reduce((total, fila) => total + fila.porcentaje_asistencia, 0) / ranking.datos.length : 0;
  const rachaMasLarga = ranking ? Math.max(0, ...ranking.datos.map((fila) => fila.racha_actual)) : 0;

  return (
    <PaginaReportes
      titulo="Ranking"
      subtitulo={detalle}
      acciones={<MenuExportar disabled={!ranking || ranking.datos.length === 0} preparando={preparando} onExportar={(formato) => void exportar(formato)} />}
    >
      <div className="min-w-0 space-y-6">
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
            <button
              type="button"
              aria-pressed={tipoRanking === "general"}
              onClick={() => setTipoRanking("general")}
              className={cn(
                "min-h-9 rounded-lg px-3 text-sm font-semibold transition-colors",
                tipoRanking === "general"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-950 dark:text-white"
                  : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white",
              )}
            >
              General
            </button>
          </div>

          {tipoRanking === "mensual" && (
            <SelectorDeMes mes={mes} mesActual={hoy.slice(0, 7)} onCambiar={setMes} />
          )}
          {tipoRanking === "anual" && (
            <SelectorDeAnio anio={anio} anioActual={anioActual} onCambiar={setAnio} />
          )}
        </div>

        {consulta.isPending && <CargandoReporte />}
        {consulta.isError && <ErrorDelReporte error={consulta.error} reintentando={consulta.isFetching} onReintentar={() => void consulta.refetch()} />}
        {ranking && ranking.datos.length === 0 && (
          <ReporteVacio
            icono={<Trophy className="size-7" />}
            titulo="Todavía no hay ranking"
            texto={`Se necesitan al menos ${ranking.minimo_clases} clases previstas en el período para aparecer.`}
          />
        )}
        {ranking && ranking.datos.length > 0 && (
          <div className="flex flex-col gap-5">
            <ResumenEnTarjetas
              datos={[
                { etiqueta: "Participantes", valor: String(ranking.total) },
                { etiqueta: "Asistencia perfecta", valor: String(perfectos) },
                { etiqueta: "Racha más larga", valor: rachaMasLarga === 0 ? "—" : `${rachaMasLarga} clases` },
                { etiqueta: "Asistencia promedio", valor: formatearPorcentaje(promedio) },
              ]}
              aclaracion="Es el mismo ranking que ven alumnos y profesores. Si empatan en porcentaje, va primero quien vino a más clases."
            />
            <TablaRanking ranking={ranking} />
          </div>
        )}
      </div>
      {impresion && <TablaImprimible tabla={impresion.datos} generadoEl={impresion.generadoEl} />}
    </PaginaReportes>
  );
}
