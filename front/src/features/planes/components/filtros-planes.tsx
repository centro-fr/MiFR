import { Search } from "lucide-react";
import { CLASE_CONTROL } from "@/features/planes/components/estilos";
import { SIN_ACTIVIDAD, type EstadoFiltro, type FiltrosPlanes } from "@/features/planes/utils/planes";
import type { ActividadDelPlan } from "@/types/plan";
import { cn } from "@/utils/cn";

const ESTADOS: { valor: EstadoFiltro; texto: string }[] = [
  { valor: "VIGENTES", texto: "Vigentes" },
  { valor: "BAJA", texto: "Dados de baja" },
  { valor: "TODOS", texto: "Todos" },
];

const CLASE_ETIQUETA = "text-xs font-bold tracking-wide text-slate-600 uppercase dark:text-slate-400";

interface Props {
  filtros: FiltrosPlanes;
  actividades: ActividadDelPlan[];
  onChange: (cambio: Partial<FiltrosPlanes>) => void;
}

export function FiltrosPlanesBar({ filtros, actividades, onChange }: Props) {
  return (
    <div
      role="search"
      aria-label="Filtrar planes"
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,1fr)_minmax(11rem,0.8fr)] dark:bg-surface-low"
    >
      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
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
            placeholder="Plan o actividad…"
            className={cn(CLASE_CONTROL, "pl-9")}
          />
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="filtro-actividad" className={CLASE_ETIQUETA}>
          Actividad
        </label>
        <select id="filtro-actividad" value={filtros.idActividad} onChange={(evento) => onChange({ idActividad: evento.target.value })} className={CLASE_CONTROL}>
          <option value="">Todas las actividades</option>
          <option value={SIN_ACTIVIDAD}>Sirven para cualquier actividad</option>
          {actividades.map(({ id, nombre }) => (
            <option key={id} value={id}>
              {nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor="filtro-estado" className={CLASE_ETIQUETA}>
          Estado
        </label>
        <select id="filtro-estado" value={filtros.estado} onChange={(evento) => onChange({ estado: evento.target.value as EstadoFiltro })} className={CLASE_CONTROL}>
          {ESTADOS.map(({ valor, texto }) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
