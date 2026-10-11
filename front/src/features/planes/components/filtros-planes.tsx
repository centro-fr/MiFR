import { Search } from "lucide-react";
import { CLASE_CONTROL } from "@/features/planes/components/estilos";
import { SIN_ACTIVIDAD, type EstadoFiltro, type FiltrosPlanes } from "@/features/planes/utils/planes";
import type { ModalidadActividad } from "@/types/actividad";
import type { ActividadDelPlan } from "@/types/plan";
import { cn } from "@/utils/cn";

const MODALIDADES: { valor: ModalidadActividad | ""; texto: string }[] = [
  { valor: "", texto: "Todos" },
  { valor: "GRUPAL", texto: "Grupal" },
  { valor: "PERSONALIZADA", texto: "Personalizada" },
];

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
      className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(13rem,1fr)_minmax(10rem,0.7fr)_auto] dark:bg-surface-low"
    >
      <div className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
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
      <fieldset className="flex min-w-0 flex-col gap-1.5 sm:col-span-2 xl:col-span-1">
        <legend className={cn(CLASE_ETIQUETA, "mb-1.5")}>Tipo de actividad</legend>
        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-white/15 dark:bg-white/5">
          {MODALIDADES.map(({ valor, texto }) => (
            <button
              key={texto}
              type="button"
              aria-pressed={filtros.modalidad === valor}
              onClick={() => onChange({ modalidad: valor })}
              className="min-h-[44px] flex-1 rounded-lg px-3 text-sm font-bold whitespace-nowrap text-slate-600 aria-pressed:bg-white aria-pressed:text-slate-900 aria-pressed:shadow-sm focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-300 dark:aria-pressed:bg-surface-low dark:aria-pressed:text-white"
            >
              {texto}
            </button>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
