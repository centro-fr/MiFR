import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { aniosConsultables } from "@/features/reportes/utils/formato-inscripciones";
import type { FiltrosInscripciones } from "@/types/reportes";

// Los filtros de la pestaña "Inscripciones" (US-35): año, plan y profesor/a.

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

  const opcionesAnios = aniosConsultables(anioActual).map((a) => ({ valor: String(a), texto: String(a) }));
  const opcionesPlanes = (planes.data ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }));
  const opcionesProfesoras = (profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }));

  return (
    <div role="group" aria-label="Filtros" className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:max-w-3xl">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-anio" className={ETIQUETA}>
          Año
        </label>
        <SelectorDesplegable
          id="inscripciones-anio"
          valor={String(filtros.anio)}
          opciones={opcionesAnios}
          onChange={(v) => onCambiar({ ...filtros, anio: Number(v) })}
          variante="formulario"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-plan" className={ETIQUETA}>
          Plan
        </label>
        <SelectorDesplegable
          id="inscripciones-plan"
          valor={filtros.idPlan ? String(filtros.idPlan) : ""}
          todos="Todos los planes"
          opciones={opcionesPlanes}
          onChange={(v) => onCambiar({ ...filtros, idPlan: idONulo(v) })}
          variante="formulario"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="inscripciones-profesora" className={ETIQUETA}>
          Profesor/a
        </label>
        <SelectorDesplegable
          id="inscripciones-profesora"
          valor={filtros.idProfesora ? String(filtros.idProfesora) : ""}
          todos="Todo el equipo"
          opciones={opcionesProfesoras}
          onChange={(v) => onCambiar({ ...filtros, idProfesora: idONulo(v) })}
          variante="formulario"
        />
      </div>
    </div>
  );
}
