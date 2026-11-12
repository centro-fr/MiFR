import { Search } from "lucide-react";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
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
      <div className="min-w-[160px]">
        <SelectorDesplegable
          aria-label="Período de la pre-inscripción"
          valor={filtros.periodo}
          opciones={PERIODOS}
          onChange={(v) => cambiar({ periodo: v as PeriodoPendientes })}
          variante="formulario"
        />
      </div>
      <div className="min-w-[180px]">
        <SelectorDesplegable
          aria-label="Plan"
          valor={filtros.idPlan}
          todos="Todos los planes"
          opciones={planes}
          onChange={(v) => cambiar({ idPlan: v })}
          variante="formulario"
        />
      </div>
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
