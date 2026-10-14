import { Search } from "lucide-react";
import { CLASE_CONTROL } from "@/features/planes/components/estilos";
import { SIN_ACTIVIDAD, type EstadoFiltro, type FiltrosPlanes } from "@/features/planes/utils/planes";
import type { ActividadDelPlan } from "@/types/plan";
import { cn } from "@/utils/cn";

const ESTADOS: { valor: EstadoFiltro; texto: string }[] = [
  { valor: "VIGENTES", texto: "Vigentes" },
  { valor: "BAJA", texto: "Dados de baja" },
  { valor: "TODOS", texto: "Vigentes y de baja" },
];

// Las etiquetas quedan para el lector de pantalla: el ícono de búsqueda y el valor de cada
// selector ("Todas las actividades", "Vigentes") ya dicen qué filtran, y así la barra ocupa una fila.
const CLASE_ETIQUETA = "sr-only";

interface Props {
  filtros: FiltrosPlanes;
  actividades: ActividadDelPlan[];
  onChange: (cambio: Partial<FiltrosPlanes>) => void;
}

export function FiltrosPlanesBar({ filtros, actividades, onChange }: Props) {
  return (
    <div role="search" aria-label="Filtrar planes" className="@container rounded-2xl border border-border bg-card p-3 shadow-sm">
      {/* Angosto, un control por fila: dos selectores lado a lado cortaban "Todas las actividades". */}
      <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2 @2xl:grid-cols-[minmax(0,1fr)_14rem_12rem]">
        <div className="min-w-0 @sm:col-span-2 @2xl:col-span-1">
          <label htmlFor="buscar-plan" className={CLASE_ETIQUETA}>
            Buscar
          </label>
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <input
              id="buscar-plan"
              type="search"
              value={filtros.busqueda}
              onChange={(evento) => onChange({ busqueda: evento.target.value })}
              placeholder="Buscar plan o actividad…"
              className={cn(CLASE_CONTROL, "pl-9")}
            />
          </div>
        </div>
        <div className="min-w-0">
          <label htmlFor="filtro-actividad" className={CLASE_ETIQUETA}>
            Actividad
          </label>
          <select
            id="filtro-actividad"
            value={filtros.idActividad}
            onChange={(evento) => onChange({ idActividad: evento.target.value })}
            className={CLASE_CONTROL}
          >
            <option value="">Todas las actividades</option>
            <option value={SIN_ACTIVIDAD}>Sirven para cualquier actividad</option>
            {actividades.map(({ id, nombre }) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="filtro-estado" className={CLASE_ETIQUETA}>
            Estado
          </label>
          <select
            id="filtro-estado"
            value={filtros.estado}
            onChange={(evento) => onChange({ estado: evento.target.value as EstadoFiltro })}
            className={CLASE_CONTROL}
          >
            {ESTADOS.map(({ valor, texto }) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
