import { usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { aniosConsultables } from "@/features/reportes/utils/formato-inscripciones";
import type { FiltrosInscripciones } from "@/types/reportes";

// Los filtros de la pestaña "Inscripciones" (US-35): año, plan y profesor/a.

const CONTROL =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-2xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer";
const ETIQUETA = "text-xs font-bold text-slate-700 dark:text-slate-300";

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
