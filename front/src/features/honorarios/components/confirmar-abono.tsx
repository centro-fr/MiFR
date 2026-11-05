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
import { useMarcarLiquidacionAbonada } from "@/features/honorarios/hooks/use-honorarios";
import { nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { etiquetaPeriodo } from "@/features/honorarios/utils/periodo";
import type { LiquidacionResumen } from "@/types/honorarios";
import { formatearPrecio } from "@/utils/moneda";

interface Props {
  /** Se conserva al cerrar, para que el texto no desaparezca mientras el diálogo se va. */
  liquidacion: LiquidacionResumen | null;
  abierto: boolean;
  periodo: string;
  onClose: () => void;
}

// CERRADA → PAGADA es irreversible: siempre se confirma. Cerrar el mes lo hace el back solo.
export function ConfirmarAbono({ liquidacion, abierto, periodo, onClose }: Props) {
  const abonar = useMarcarLiquidacionAbonada(periodo);

  async function confirmar() {
    if (!liquidacion) return;
    try {
      await abonar.mutateAsync(liquidacion.id);
      toast.success("Honorarios marcados como abonados.");
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudieron actualizar los honorarios."));
    }
  }

  return (
    <AlertDialog open={abierto} onOpenChange={(abrir) => !abrir && !abonar.isPending && onClose()}>
      <AlertDialogContent className="w-[96vw] sm:w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">¿Marcar como abonada?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            {liquidacion && (
              <>
                <strong className="text-slate-900 dark:text-white">{nombreCompleto(liquidacion.profesora)}</strong> ·{" "}
                {etiquetaPeriodo(periodo)} · {formatearPrecio(liquidacion.montoTotal)}.{" "}
              </>
            )}
            Solo deja registro de que ya se le abonó por fuera del sistema: MiFR no mueve dinero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-3">
          <AlertDialogCancel disabled={abonar.isPending} className="h-11 px-6 rounded-xl font-bold text-sm border-slate-200 dark:border-slate-800">
            Cancelar
          </AlertDialogCancel>
          {/* Botón común y no AlertDialogAction: esa acción cierra el diálogo antes de saber si salió bien. */}
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={abonar.isPending}
            className="h-11 px-6 rounded-xl bg-primary font-bold text-sm text-white hover:bg-primary-dark transition-colors shadow-xs"
          >
            {abonar.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-1.5" />}
            {abonar.isPending ? "Guardando…" : "Marcar como abonada"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
