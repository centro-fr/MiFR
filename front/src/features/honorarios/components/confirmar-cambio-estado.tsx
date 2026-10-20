import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { AccionDeEstado } from "@/features/honorarios/components/tarjeta-profesora";
import { useCerrarLiquidacion, useMarcarLiquidacionAbonada } from "@/features/honorarios/hooks/use-honorarios";
import { nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import type { LiquidacionResumen } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

export interface CambioDeEstado {
  liquidacion: LiquidacionResumen;
  accion: AccionDeEstado;
}

const TEXTOS: Record<AccionDeEstado, { titulo: string; confirmar: string; explicacion: string; exito: string }> = {
  cerrar: {
    titulo: "¿Cerrar la liquidación?",
    confirmar: "Cerrar liquidación",
    explicacion: "Queda como foto: ya no se recalcula aunque cambien las tarifas, los alumnos o las suplencias del mes.",
    exito: "Liquidación cerrada.",
  },
  abonar: {
    titulo: "¿Marcar como abonada?",
    confirmar: "Marcar como abonada",
    explicacion: "Solo deja registro de que ya se le abonó por fuera del sistema: MiFR no mueve dinero.",
    exito: "Liquidación marcada como abonada.",
  },
};

interface Props {
  cambio: CambioDeEstado | null;
  periodo: string;
  onClose: () => void;
}

// Las dos transiciones son irreversibles (BORRADOR → CERRADA → PAGADA): siempre se confirman.
export function ConfirmarCambioEstado({ cambio, periodo, onClose }: Props) {
  const cerrar = useCerrarLiquidacion(periodo);
  const abonar = useMarcarLiquidacionAbonada(periodo);
  const mutacion = cambio?.accion === "abonar" ? abonar : cerrar;
  const textos = cambio ? TEXTOS[cambio.accion] : TEXTOS.cerrar;

  async function confirmar() {
    if (!cambio) return;
    try {
      await mutacion.mutateAsync(cambio.liquidacion.id);
      toast.success(textos.exito);
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo actualizar la liquidación."));
    }
  }

  return (
    <AlertDialog open={cambio !== null} onOpenChange={(abierto) => !abierto && !mutacion.isPending && onClose()}>
      <AlertDialogContent className="border-border bg-white dark:bg-surface-low">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-extrabold text-slate-900 dark:text-white">{textos.titulo}</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300">
            {cambio && (
              <>
                <strong className="text-slate-900 dark:text-white">{nombreCompleto(cambio.liquidacion.profesora)}</strong> ·{" "}
                {etiquetaPeriodo(periodo)} · {formatearPrecio(cambio.liquidacion.montoTotal)}.{" "}
              </>
            )}
            {textos.explicacion}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutacion.isPending} className="min-h-11 rounded-xl font-bold">
            Cancelar
          </AlertDialogCancel>
          {/* Botón común y no AlertDialogAction: esa acción cierra el diálogo antes de saber si salió bien. */}
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={mutacion.isPending}
            className="min-h-11 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark"
          >
            {mutacion.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {mutacion.isPending ? "Guardando…" : textos.confirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
