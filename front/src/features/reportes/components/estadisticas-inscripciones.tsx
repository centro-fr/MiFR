import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import {
  acumulados,
  aniosConsultables,
  describirComparacion,
  formatearDecimal,
  promedioMensual,
  tendencia,
  type Tendencia,
} from "@/features/reportes/utils/formato-inscripciones";
import type { AltasDelMes, EstadisticasInscripciones, FiltrosInscripciones } from "@/types/reportes";

// Piezas de la pestaña "Inscripciones" (US-35): filtros, resumen y tabla por mes.

const CONTROL =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer";
const ETIQUETA = "text-xs font-bold text-slate-700 dark:text-slate-300";
const TARJETA = "rounded-3xl border border-slate-200/80 bg-white p-5 shadow-xs sm:p-6 dark:border-slate-800 dark:bg-slate-900/60";

interface PropsFiltros {
  filtros: FiltrosInscripciones;
  anioActual: number;
  onCambiar: (filtros: FiltrosInscripciones) => void;
}

/** Se aplican al elegir: son listas cortas y cada cambio es un solo pedido. */
export function FiltrosDeInscripciones({ filtros, anioActual, onCambiar }: PropsFiltros) {
  const planes = usePlanesParaFiltro();
  const profesoras = useProfesorasParaFiltro();
  const idONulo = (valor: string) => (valor ? Number(valor) : null);

  return (
    <div role="group" aria-label="Filtros" className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-anio" className={ETIQUETA}>
          Año
        </label>
        <select
          id="inscripciones-anio"
          value={filtros.anio}
          onChange={(e) => onCambiar({ ...filtros, anio: Number(e.target.value) })}
          className={CONTROL}
        >
          {aniosConsultables(anioActual).map((anio) => (
            <option key={anio} value={anio}>
              {anio}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-plan" className={ETIQUETA}>
          Plan
        </label>
        <select
          id="inscripciones-plan"
          value={filtros.idPlan ?? ""}
          onChange={(e) => onCambiar({ ...filtros, idPlan: idONulo(e.target.value) })}
          className={CONTROL}
        >
          <option value="">Todos los planes</option>
          {planes.data?.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-profesora" className={ETIQUETA}>
          Profesor/a
        </label>
        <select
          id="inscripciones-profesora"
          value={filtros.idProfesora ?? ""}
          onChange={(e) => onCambiar({ ...filtros, idProfesora: idONulo(e.target.value) })}
          className={CONTROL}
        >
          <option value="">Todo el equipo</option>
          {profesoras.data?.map((p) => (
            <option key={p.id} value={p.id}>{`${p.nombre} ${p.apellido}`}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function ResumenDeInscripciones({
  estadisticas,
  transcurridos,
}: {
  estadisticas: EstadisticasInscripciones;
  transcurridos: AltasDelMes[];
}) {
  const { mesPico } = estadisticas;
  const datos: [string, string, string | null][] = [
    [`Altas en ${estadisticas.anio}`, String(estadisticas.totalAltas), null],
    ["Mes con más altas", mesPico ? mesPico.nombre : "—", mesPico ? `${mesPico.cantidad} altas` : null],
    ["Promedio por mes", formatearDecimal(promedioMensual(transcurridos)), `En ${transcurridos.length} ${transcurridos.length === 1 ? "mes" : "meses"}`],
  ];

  return (
    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {datos.map(([etiqueta, valor, detalle], indice) => (
        <div
          key={etiqueta}
          className={
            indice === 0
              ? "rounded-2xl bg-primary-dark p-4 sm:p-5 text-white shadow-md shadow-primary/20"
              : "rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 dark:border-slate-700/80 dark:bg-slate-900 shadow-2xs"
          }
        >
          <dt className={indice === 0 ? "text-xs sm:text-sm font-semibold text-white/90" : "text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400"}>
            {etiqueta}
          </dt>
          <dd className="mt-1 text-2xl sm:text-3xl font-black tabular-nums tracking-tight">
            {valor}
          </dd>
          {detalle && (
            <dd className={indice === 0 ? "text-xs text-white/80 mt-0.5" : "text-xs text-slate-500 dark:text-slate-400 mt-0.5"}>
              {detalle}
            </dd>
          )}
        </div>
      ))}
    </dl>
  );
}

const ICONO_TENDENCIA: Record<Tendencia, { Icono: typeof TrendingUp; clase: string } | null> = {
  sube: { Icono: TrendingUp, clase: "text-emerald-600 dark:text-emerald-400" },
  baja: { Icono: TrendingDown, clase: "text-rose-600 dark:text-rose-400" },
  igual: { Icono: Minus, clase: "text-slate-400" },
  "sin-dato": null,
};

function Comparacion({ mes }: { mes: AltasDelMes }) {
  const icono = ICONO_TENDENCIA[tendencia(mes)];
  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums font-semibold">
      {icono && <icono.Icono aria-hidden="true" className={`size-4 shrink-0 ${icono.clase}`} />}
      {describirComparacion(mes)}
    </span>
  );
}

const TH = "px-4 py-3.5 text-left text-xs font-bold tracking-wider text-slate-700 uppercase dark:text-slate-300";
const TD = "border-t border-slate-100 px-4 py-3.5 text-sm dark:border-slate-800/80";

export function TablaAltasPorMes({
  estadisticas,
  transcurridos,
}: {
  estadisticas: EstadisticasInscripciones;
  transcurridos: AltasDelMes[];
}) {
  const acumulado = acumulados(transcurridos);

  return (
    <Card role="region" aria-labelledby="titulo-detalle-por-mes" className={TARJETA}>
      <h3 id="titulo-detalle-por-mes" className="text-base font-extrabold text-slate-900 dark:text-white">
        Detalle por mes
      </h3>

      {/* VISTA MOBILE: TARJETAS */}
      <ul className="mt-4 flex flex-col gap-2.5 md:hidden">
        {transcurridos.map((mes, indice) => (
          <li
            key={mes.mes}
            className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-4"
          >
            <div className="min-w-0">
              <p className="font-bold text-base text-slate-900 dark:text-white">{mes.nombre}</p>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                <Comparacion mes={mes} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Acumulado anual: <span className="font-bold">{acumulado[indice]}</span>
              </p>
            </div>
            <p className="shrink-0 text-3xl font-black text-slate-900 tabular-nums dark:text-white">
              {mes.cantidad}
            </p>
          </li>
        ))}
      </ul>

      {/* VISTA DESKTOP: TABLA */}
      <div className="mt-4 hidden md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40">
              <th scope="col" className={TH}>Mes</th>
              <th scope="col" className={`${TH} text-right`}>Altas</th>
              <th scope="col" className={TH}>Vs. mes anterior</th>
              <th scope="col" className={`${TH} text-right`}>Acumulado del año</th>
            </tr>
          </thead>
          <tbody>
            {transcurridos.map((mes, indice) => (
              <tr key={mes.mes} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <th scope="row" className={`${TD} text-left font-bold text-slate-900 dark:text-white`}>
                  {mes.nombre}
                </th>
                <td className={`${TD} text-right font-black text-slate-900 tabular-nums dark:text-white`}>
                  {mes.cantidad}
                </td>
                <td className={`${TD} text-slate-700 dark:text-slate-200`}>
                  <Comparacion mes={mes} />
                </td>
                <td className={`${TD} text-right tabular-nums font-semibold`}>
                  {acumulado[indice]}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50/70 dark:bg-slate-800/40">
              <th scope="row" className="border-t-2 border-slate-200 px-4 py-3 text-left font-extrabold text-slate-900 dark:border-slate-700 dark:text-white">
                Total del año
              </th>
              <td className="border-t-2 border-slate-200 px-4 py-3 text-right font-black text-slate-900 tabular-nums dark:border-slate-700 dark:text-white">
                {estadisticas.totalAltas}
              </td>
              <td className="border-t-2 border-slate-200 dark:border-slate-700" colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="mt-3 flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3 font-extrabold text-slate-900 md:hidden dark:border-slate-700 dark:text-white">
        Total del año <span className="tabular-nums text-xl">{estadisticas.totalAltas}</span>
      </p>
    </Card>
  );
}
