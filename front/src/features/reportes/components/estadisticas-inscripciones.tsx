import { GrupoDeFiltros, SelectFiltro, ETIQUETA_FILTRO } from "@/features/reportes/components/piezas-reporte";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
import { usePlanesParaFiltro, useProfesorasParaFiltro } from "@/features/reportes/hooks/use-reportes";
import { aniosConsultables } from "@/features/reportes/utils/formato-inscripciones";
import type { FiltrosInscripciones } from "@/types/reportes";

// Los filtros de la pestaña "Inscripciones" (US-35): año, plan y profesor/a. Usan las mismas piezas
// que el resto de los reportes, con "Limpiar filtros" al final de la fila.

interface PropsFiltros {
  filtros: FiltrosInscripciones;
  anioActual: number;
  onCambiar: (filtros: FiltrosInscripciones) => void;
  onLimpiar: () => void;
  hayFiltros: boolean;
}

/** Se aplican al elegir: son listas cortas y cada cambio es un solo pedido. */
export function FiltrosDeInscripciones({ filtros, anioActual, onCambiar, onLimpiar, hayFiltros }: PropsFiltros) {
  const planes = usePlanesParaFiltro();
  const profesoras = useProfesorasParaFiltro();
  const idONulo = (valor: string) => (valor ? Number(valor) : null);

  const opcionesAnios = aniosConsultables(anioActual).map((a) => ({ valor: String(a), texto: String(a) }));
  const opcionesPlanes = (planes.data ?? []).map((p) => ({ valor: String(p.id), texto: p.nombre }));
  const opcionesProfesoras = (profesoras.data ?? []).map((p) => ({ valor: String(p.id), texto: `${p.nombre} ${p.apellido}` }));

  return (
    <div role="group" aria-label="Filtros">
      <GrupoDeFiltros onLimpiar={onLimpiar} hayFiltros={hayFiltros}>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="inscripciones-anio" className={ETIQUETA_FILTRO}>
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
        <SelectFiltro
          id="inscripciones-plan"
          etiqueta="Plan"
          todos="Todos los planes"
          valor={filtros.idPlan === null ? "" : String(filtros.idPlan)}
          opciones={opcionesPlanes}
          onChange={(valor) => onCambiar({ ...filtros, idPlan: idONulo(valor) })}
        />
        <SelectFiltro
          id="inscripciones-profesora"
          etiqueta="Profesor/a"
          todos="Todo el equipo"
          valor={filtros.idProfesora === null ? "" : String(filtros.idProfesora)}
          opciones={opcionesProfesoras}
          onChange={(valor) => onCambiar({ ...filtros, idProfesora: idONulo(valor) })}
        />
      </GrupoDeFiltros>
    </div>
  );
}
