import { useId, useState } from "react";
import { ChevronDown, MoreVertical } from "lucide-react";
import { Can } from "@/components/guards/can";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeEstadoLiquidacion } from "@/features/honorarios/components/badge-estado-liquidacion";
import { DetalleLiquidacion } from "@/features/honorarios/components/detalle-liquidacion";
import { formatearAjuste, inicialesDe, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import type { DesgloseLiquidacion, LiquidacionResumen } from "@/types/honorarios";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

export type AccionDeEstado = "cerrar" | "abonar";

interface PropsTarjeta {
  liquidacion: LiquidacionResumen;
  onCambiarEstado: (liquidacion: LiquidacionResumen, accion: AccionDeEstado) => void;
}

function cantidadDeAlumnos(cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? "alumno" : "alumnos"}`;
}

const FILA = "flex items-baseline justify-between gap-3 text-sm";

// Sin la tarifa: un borrador calculado antes de cambiarla mostraría una que no se aplicó. La tarifa
// general está arriba de la página y la aplicada, en cada línea del detalle.
function Desglose({ desglose }: { desglose: DesgloseLiquidacion }) {
  const ajuste = desglose.subtotalSuplencias;
  return (
    <dl className="space-y-1.5">
      <div className={FILA}>
        <dt className="text-muted-foreground">{cantidadDeAlumnos(desglose.cantidadAlumnos)}</dt>
        <dd className="font-semibold text-slate-800 tabular-nums dark:text-slate-100">{formatearPrecio(desglose.subtotalAlumnos)}</dd>
      </div>
      <div className={FILA}>
        <dt className="text-muted-foreground">Suplencias</dt>
        <dd
          className={cn(
            "font-semibold tabular-nums",
            ajuste > 0 && "text-emerald-700 dark:text-emerald-300",
            ajuste < 0 && "text-rose-700 dark:text-rose-300",
            ajuste === 0 && "text-muted-foreground",
          )}
        >
          {formatearAjuste(ajuste)}
        </dd>
      </div>
    </dl>
  );
}

function MenuEstado({ liquidacion, onCambiarEstado }: Pick<PropsTarjeta, "liquidacion" | "onCambiarEstado">) {
  if (liquidacion.estado === "PAGADA") return null;
  const accion: AccionDeEstado = liquidacion.estado === "BORRADOR" ? "cerrar" : "abonar";
  return (
    <Can permission="HONORARIOS_LIQUIDAR">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Más acciones para ${nombreCompleto(liquidacion.profesora)}`}
            className="size-11 shrink-0 rounded-lg text-slate-500 pointer-fine:size-9 dark:text-slate-300"
          >
            <MoreVertical aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => onCambiarEstado(liquidacion, accion)} className="min-h-11">
            {accion === "cerrar" ? "Cerrar honorarios" : "Marcar como abonados"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </Can>
  );
}

export function TarjetaProfesora({ liquidacion, onCambiarEstado }: PropsTarjeta) {
  const [abierta, setAbierta] = useState(false);
  const idDetalle = useId();
  const { profesora } = liquidacion;

  return (
    <Card className="flex flex-col rounded-2xl border-border bg-white shadow-sm dark:bg-surface-low">
      <div className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-extrabold text-primary-dark dark:bg-primary/20 dark:text-pink-200"
          >
            {inicialesDe(profesora)}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="break-words text-base font-extrabold text-dark dark:text-white">{nombreCompleto(profesora)}</h2>
            <BadgeEstadoLiquidacion estado={liquidacion.estado} className="mt-1" />
          </div>
          <MenuEstado liquidacion={liquidacion} onCambiarEstado={onCambiarEstado} />
        </div>

        <p className="text-3xl font-black tracking-tight text-dark tabular-nums dark:text-white">{formatearPrecio(liquidacion.montoTotal)}</p>

        {liquidacion.desglose && <Desglose desglose={liquidacion.desglose} />}
      </div>

      <div className="border-t border-border">
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idDetalle}
          onClick={() => setAbierta((actual) => !actual)}
          className="flex min-h-11 w-full items-center gap-1.5 px-5 text-sm font-bold text-slate-700 transition-colors hover:text-primary-dark dark:text-slate-200 dark:hover:text-pink-300"
        >
          Ver detalle
          <ChevronDown
            aria-hidden="true"
            className={cn("size-4 transition-transform duration-200 motion-reduce:transition-none", abierta && "rotate-180")}
          />
        </button>
        {/* El detalle se monta (y se pide) recién al abrir la tarjeta. */}
        <div id={idDetalle} hidden={!abierta} className="px-5 pb-4">
          {abierta && <DetalleLiquidacion id={liquidacion.id} />}
        </div>
      </div>
    </Card>
  );
}
