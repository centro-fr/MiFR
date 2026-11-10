import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hayFiltrosActivos,
  type FiltrosTransferencias,
  type OrdenTransferencias,
} from "@/features/transferencias/utils/filtros-transferencias";
import type { EstadoTransferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";

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
  const [mostrarFiltrosMobile, setMostrarFiltrosMobile] = useState(false);
  const cambiar = (cambios: Partial<FiltrosTransferencias>) => onChange({ ...filtros, ...cambios });
  const conEstado = estado !== undefined && onEstado !== undefined;
  const activos = hayFiltrosActivos(filtros);

  return (
    <section
      role="search"
      aria-label="Filtrar transferencias"
      className="space-y-2.5"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-[280px] max-w-sm">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="search"
            aria-label="Buscar por alumno"
            placeholder="Buscar alumno…"
            value={filtros.busqueda}
            maxLength={60}
            onChange={(evento) => cambiar({ busqueda: evento.target.value })}
            className="h-10 w-full rounded-lg border-slate-200 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400 shadow-2xs transition-colors focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-900"
          />
        </div>

        {/* Botón de filtros para mobile */}
        <button
          type="button"
          aria-label="Filtros adicionales"
          onClick={() => setMostrarFiltrosMobile((v) => !v)}
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs transition-colors xl:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            (mostrarFiltrosMobile || activos) && "border-primary text-primary",
          )}
        >
          <SlidersHorizontal className="size-4" />
        </button>

        <div className={cn("flex flex-wrap items-center gap-2.5 w-full xl:w-auto", !mostrarFiltrosMobile && "hidden xl:flex")}>
          {conEstado && (
            <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
              <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Estado
              </span>
              <select
                aria-label="Estado"
                value={estado}
                onChange={(evento) => onEstado(evento.target.value as EstadoTransferencia)}
                className="appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
              >
                {ESTADOS.map(({ valor, texto }) => (
                  <option key={valor} value={valor}>
                    {texto}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 size-4 text-slate-400" />
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
          <div className="h-10 relative inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 shadow-2xs dark:border-slate-700 dark:bg-slate-900">
            <span className="mr-2 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
              Orden
            </span>
            <select
              aria-label="Ordenar"
              value={filtros.orden}
              onChange={(evento) => cambiar({ orden: evento.target.value as OrdenTransferencias })}
              className="appearance-none bg-transparent pr-6 text-sm font-semibold text-slate-800 outline-none cursor-pointer dark:text-slate-200"
            >
              {ORDENES.map(({ valor, texto }) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 size-4 text-slate-400" />
          </div>
          {activos && (
            <Button type="button" variant="ghost" onClick={onLimpiar} className="min-h-[36px] text-xs font-bold text-primary hover:text-primary-dark">
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
