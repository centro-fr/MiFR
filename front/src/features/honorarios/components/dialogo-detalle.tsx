import { X } from "lucide-react";
import { FilaDeDetalle, FilaDeTotal, ListaDeDetalle } from "@/components/detalle/lista-de-detalle";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { BOTON_MODAL, CABECERA_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

function ResumenDelMes({ liquidacion }: { liquidacion: LiquidacionResumen }) {
  const { desglose } = liquidacion;
  return (
    <section aria-labelledby="titulo-resumen-honorarios" className="flex flex-col gap-1">
      <h3 id="titulo-resumen-honorarios" className="text-sm font-bold text-slate-800 dark:text-slate-200">
        Resumen del mes
      </h3>
      <ListaDeDetalle className="tabular-nums">
        {desglose && (
          <>
            <FilaDeDetalle etiqueta={`Por ${cantidadDeAlumnos(desglose.cantidadAlumnos)}`}>
              {formatearPrecio(desglose.subtotalAlumnos)}
            </FilaDeDetalle>
            <FilaDeDetalle etiqueta="Suplencias">{formatearAjuste(desglose.subtotalSuplencias)}</FilaDeDetalle>
          </>
        )}
        <FilaDeTotal etiqueta="Total">{formatearPrecio(liquidacion.montoTotal)}</FilaDeTotal>
      </ListaDeDetalle>
    </section>
  );
}

/**
 * El detalle de un profesor/a en el mes, leído como un ticket: alumno por alumno y clase por clase,
 * y al final de dónde sale el total.
 */
export function DialogoDetalle({ liquidacion, abierto, periodo, onClose }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-slate-200 bg-white p-0 sm:max-w-lg sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <DialogHeader className={cn(CABECERA_MODAL, "flex flex-row items-center justify-between gap-2 pr-6")}>
          <div className="min-w-0">
            <DialogTitle className={TITULO_MODAL}>
              {liquidacion ? nombreCompleto(liquidacion.profesora) : ""}
            </DialogTitle>
            <DialogDescription className={DESCRIPCION_MODAL}>
              Honorarios · {etiquetaPeriodo(periodo)}
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
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-6 py-5">
          {liquidacion && <DetalleLiquidacion id={liquidacion.id} />}
          {liquidacion && <ResumenDelMes liquidacion={liquidacion} />}
        </div>
        <DialogFooter className={PIE_MODAL}>
          <Button type="button" variant="outline" onClick={onClose} className={BOTON_MODAL}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
