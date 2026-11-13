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
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

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
      <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <AlertDialogHeader className={CABECERA_MODAL}>
          <AlertDialogTitle className={TITULO_MODAL}>¿Marcar como abonada?</AlertDialogTitle>
          <AlertDialogDescription className={DESCRIPCION_MODAL}>
            {liquidacion && (
              <>
                <strong className="text-slate-900 dark:text-white">{nombreCompleto(liquidacion.profesora)}</strong> ·{" "}
                {etiquetaPeriodo(periodo)} · {formatearPrecio(liquidacion.montoTotal)}.{" "}
              </>
            )}
            Solo deja registro de que ya se le abonó por fuera del sistema: MiFR no mueve dinero.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={PIE_MODAL}>
          <AlertDialogCancel disabled={abonar.isPending} className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Cancelar
          </AlertDialogCancel>
          {/* Botón común y no AlertDialogAction: esa acción cierra el diálogo antes de saber si salió bien. */}
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={abonar.isPending}
            className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
          >
            {abonar.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-1.5" />}
            {abonar.isPending ? "Guardando…" : "Marcar como abonada"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
