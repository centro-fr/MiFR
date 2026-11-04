import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DetalleLiquidacion } from "@/features/honorarios/components/detalle-liquidacion";
import { ETIQUETA_ESTADO, cantidadDeAlumnos, formatearAjuste, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import type { LiquidacionResumen } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

interface Props {
  /** Se conserva al cerrar, para que el contenido no desaparezca mientras el diálogo se va. */
  liquidacion: LiquidacionResumen | null;
  abierto: boolean;
  periodo: string;
  onClose: () => void;
}

/** El detalle de un profesor/a en el mes: de dónde sale el total, alumno por alumno y clase por clase. */
export function DialogoDetalle({ liquidacion, abierto, periodo, onClose }: Props) {
  const desglose = liquidacion?.desglose;
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-border bg-white p-0 sm:max-w-xl dark:bg-surface-low">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 px-5 py-4 text-left sm:px-6 dark:border-slate-800">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Honorarios</p>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">
              {liquidacion ? nombreCompleto(liquidacion.profesora) : ""}
            </DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {etiquetaPeriodo(periodo)}
              {liquidacion && ` · ${ETIQUETA_ESTADO[liquidacion.estado]}`}
            </DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar el detalle"
            className="size-11 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 pointer-fine:size-9 dark:hover:bg-slate-800"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {liquidacion && (
            <dl className="space-y-2 text-sm tabular-nums">
              {desglose && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Por {cantidadDeAlumnos(desglose.cantidadAlumnos)}</dt>
                    <dd className="font-semibold">{formatearPrecio(desglose.subtotalAlumnos)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">Suplencias</dt>
                    <dd className="font-semibold">{formatearAjuste(desglose.subtotalSuplencias)}</dd>
                  </div>
                </>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-border pt-2">
                <dt className="font-bold text-dark dark:text-white">Total</dt>
                <dd className="text-lg font-black text-dark dark:text-white">{formatearPrecio(liquidacion.montoTotal)}</dd>
              </div>
            </dl>
          )}
          {abierto && liquidacion && <DetalleLiquidacion id={liquidacion.id} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
