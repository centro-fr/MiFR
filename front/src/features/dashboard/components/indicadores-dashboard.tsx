import { useEstadisticasInscripciones, useEstadisticasPlanes } from "@/features/reportes/hooks/use-reportes";
import { fechaActualArgentina } from "@/utils/fecha";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const SIN_FILTROS_PLANES = { idActividad: null, idProfesora: null } as const;

function Indicador({ titulo, valor }: { titulo: string; valor: number | undefined }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{titulo}</dt>
      <dd className="text-2xl leading-9 font-bold tabular-nums text-slate-900 dark:text-white">
        {valor ?? <span aria-label="Cargando">—</span>}
      </dd>
    </div>
  );
}

/** Los números del día, en tarjetas: altas del mes y del año (US-35) y alumnos activos (US-36). */
export function IndicadoresDashboard() {
  const hoy = fechaActualArgentina();
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7));
  const inscripciones = useEstadisticasInscripciones({ anio, idPlan: null, idProfesora: null });
  const planes = useEstadisticasPlanes(SIN_FILTROS_PLANES);

  return (
    <dl
      aria-label="Indicadores"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 [&>div:last-child]:col-span-2 sm:[&>div:last-child]:col-span-1"
    >
      <Indicador titulo={`Altas en ${MESES[mes - 1]}`} valor={inscripciones.data?.meses.find((m) => m.mes === mes)?.cantidad} />
      <Indicador titulo={`Altas en ${anio}`} valor={inscripciones.data?.totalAltas} />
      <Indicador titulo="Alumnos activos" valor={planes.data?.alumnosActivos} />
    </dl>
  );
}
