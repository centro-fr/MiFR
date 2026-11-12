import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CampoFecha } from "@/components/formulario/campo-fecha";
import { SelectorDesplegable } from "@/components/formulario/selector-desplegable";
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
            <SelectorDesplegable
              etiqueta="Estado"
              aria-label="Estado"
              valor={estado}
              opciones={ESTADOS}
              onChange={(v) => onEstado?.(v as EstadoTransferencia)}
              variante="pildora"
            />
          )}
          <div className="w-40 sm:w-44">
            <CampoFecha
              aria-label="Fecha de la transferencia"
              placeholder="dd/mm/aaaa"
              value={filtros.fecha}
              onChange={(fecha) => cambiar({ fecha })}
              className="h-10 rounded-lg border-slate-200 dark:border-slate-700 dark:bg-slate-900 text-sm font-semibold shadow-2xs"
            />
          </div>
          <SelectorDesplegable
            etiqueta="Orden"
            aria-label="Ordenar"
            valor={filtros.orden}
            opciones={ORDENES}
            onChange={(v) => cambiar({ orden: v as OrdenTransferencias })}
            variante="pildora"
          />
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
