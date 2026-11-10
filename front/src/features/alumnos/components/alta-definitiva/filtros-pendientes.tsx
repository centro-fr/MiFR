import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hayFiltrosActivos,
  type FiltrosPendientes as Filtros,
  type PeriodoPendientes,
} from "@/features/alumnos/utils/pendientes-de-alta";

const PERIODOS: { valor: PeriodoPendientes; texto: string }[] = [
  { valor: "TODAS", texto: "Todas" },
  { valor: "7", texto: "Últimos 7 días" },
  { valor: "30", texto: "Últimos 30 días" },
];

const CLASE_SELECT =
  "min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus-visible:outline-2 focus-visible:outline-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

interface Props {
  filtros: Filtros;
  planes: { id: string; nombre: string }[];
  onChange: (filtros: Filtros) => void;
  onLimpiar: () => void;
}

export function FiltrosPendientes({ filtros, planes, onChange, onLimpiar }: Props) {
  const cambiar = (cambios: Partial<Filtros>) => onChange({ ...filtros, ...cambios });

  return (
    <div
      role="search"
      aria-label="Filtrar pre-inscripciones"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="relative min-w-0 sm:min-w-[280px] sm:flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          aria-label="Buscar por nombre, DNI o tutor"
          placeholder="Buscar por nombre, DNI o tutor…"
          value={filtros.busqueda}
          maxLength={60}
          onChange={(evento) => cambiar({ busqueda: evento.target.value })}
          className="min-h-[44px] rounded-xl border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-500 shadow-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>
      <select
        aria-label="Período de la pre-inscripción"
        value={filtros.periodo}
        onChange={(evento) => cambiar({ periodo: evento.target.value as PeriodoPendientes })}
        className={CLASE_SELECT}
      >
        {PERIODOS.map(({ valor, texto }) => (
          <option key={valor} value={valor}>
            {texto}
          </option>
        ))}
      </select>
      <select
        aria-label="Plan"
        value={filtros.idPlan}
        onChange={(evento) => cambiar({ idPlan: evento.target.value })}
        className={CLASE_SELECT}
      >
        <option value="">Todos los planes</option>
        {planes.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.nombre}
          </option>
        ))}
      </select>
      {hayFiltrosActivos(filtros) && (
        <Button
          type="button"
          variant="outline"
          onClick={onLimpiar}
          className="min-h-[44px] rounded-xl font-bold text-primary hover:text-primary-dark"
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
