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

const CLASE_CONTROL =
  "min-h-[44px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus-visible:outline-2 focus-visible:outline-primary dark:border-white/15 dark:bg-surface-low dark:text-slate-200";

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
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          aria-label="Buscar por alumno"
          placeholder="Buscar alumno…"
          value={filtros.busqueda}
          maxLength={60}
          onChange={(evento) => cambiar({ busqueda: evento.target.value })}
          className="min-h-[44px] rounded-xl border-slate-200 bg-white pl-9 text-slate-900 placeholder:text-slate-500 shadow-none dark:border-white/15 dark:bg-surface-low dark:text-slate-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        {conEstado && (
          <select
            aria-label="Estado"
            value={estado}
            onChange={(evento) => onEstado(evento.target.value as EstadoTransferencia)}
            className={CLASE_CONTROL}
          >
            {ESTADOS.map(({ valor, texto }) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </select>
        )}
        <input
          type="date"
          aria-label="Fecha de la transferencia"
          value={filtros.fecha}
          onChange={(evento) => cambiar({ fecha: evento.target.value })}
          className={conEstado ? CLASE_CONTROL : `${CLASE_CONTROL} col-span-2 sm:col-span-1`}
        />
        <select
          aria-label="Ordenar"
          value={filtros.orden}
          onChange={(evento) => cambiar({ orden: evento.target.value as OrdenTransferencias })}
          className={`${CLASE_CONTROL} col-span-2 sm:col-span-1`}
        >
          {ORDENES.map(({ valor, texto }) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
      </div>
      {hayFiltrosActivos(filtros) && (
        <Button type="button" variant="outline" onClick={onLimpiar} className="min-h-[44px] rounded-xl font-bold text-primary hover:text-primary-dark">
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
