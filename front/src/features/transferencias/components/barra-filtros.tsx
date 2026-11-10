import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hayFiltrosActivos,
  type FiltrosTransferencias,
  type OrdenTransferencias,
} from "@/features/transferencias/utils/filtros-transferencias";
import type { EstadoTransferencia } from "@/types/transferencia";

const ESTADOS: { valor: EstadoTransferencia; texto: string }[] = [
  { valor: "PENDIENTE", texto: "Pendientes" },
  { valor: "CONFIRMADO", texto: "Aprobadas" },
  { valor: "RECHAZADO", texto: "Rechazadas" },
];

const ORDENES: { valor: OrdenTransferencias; texto: string }[] = [
  { valor: "ANTIGUAS", texto: "Más antiguas primero" },
  { valor: "RECIENTES", texto: "Más recientes primero" },
  { valor: "MONTO", texto: "Mayor monto" },
];

interface Props {
  /** Sin estado no se muestra su selector: la lista es de un solo estado (por ejemplo, las pendientes). */
  estado?: EstadoTransferencia;
  filtros: FiltrosTransferencias;
  onEstado?: (estado: EstadoTransferencia) => void;
  onChange: (filtros: FiltrosTransferencias) => void;
  onLimpiar: () => void;
}

export function BarraFiltros({ estado, filtros, onEstado, onChange, onLimpiar }: Props) {
  const cambiar = (cambios: Partial<FiltrosTransferencias>) => onChange({ ...filtros, ...cambios });
  const conEstado = estado !== undefined && onEstado !== undefined;

  return (
    <div
      role="search"
      aria-label="Filtrar transferencias"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <div className="relative min-w-0 sm:min-w-[240px] sm:flex-1">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          aria-label="Buscar por alumno"
          placeholder="Buscar alumno…"
          value={filtros.busqueda}
          maxLength={60}
          onChange={(evento) => cambiar({ busqueda: evento.target.value })}
          className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {conEstado && (
          <div className="h-10 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Estado
            </span>
            <select
              aria-label="Estado"
              value={estado}
              onChange={(evento) => onEstado(evento.target.value as EstadoTransferencia)}
              className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
            >
              {ESTADOS.map(({ valor, texto }) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="h-10 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
          <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Fecha
          </span>
          <input
            type="date"
            aria-label="Fecha de la transferencia"
            value={filtros.fecha}
            onChange={(evento) => cambiar({ fecha: evento.target.value })}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
          />
        </div>
        <div className="h-10 inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
          <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Orden
          </span>
          <select
            aria-label="Ordenar"
            value={filtros.orden}
            onChange={(evento) => cambiar({ orden: evento.target.value as OrdenTransferencias })}
            className="bg-transparent text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
          >
            {ORDENES.map(({ valor, texto }) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        </div>
      </div>
      {hayFiltrosActivos(filtros) && (
        <Button type="button" variant="ghost" onClick={onLimpiar} className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
