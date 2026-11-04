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
import { fechaCorta, nombreCompleto } from "@/features/honorarios/utils/formato-honorarios";
import { useEliminarSuplencia } from "@/features/suplencias/hooks/use-suplencias";
import type { Suplencia } from "@/types/suplencia";

interface Props {
  suplencia: Suplencia | null;
  onClose: () => void;
}

export function ConfirmarEliminarSuplencia({ suplencia, onClose }: Props) {
  const eliminar = useEliminarSuplencia();

  async function confirmar() {
    if (!suplencia) return;
    try {
      await eliminar.mutateAsync(suplencia.idClase);
      toast.success("Suplencia eliminada.");
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo eliminar la suplencia."));
    }
  }

  return (
    <AlertDialog open={suplencia !== null} onOpenChange={(abierto) => !abierto && !eliminar.isPending && onClose()}>
      <AlertDialogContent className="w-[96vw] sm:w-full max-w-md rounded-3xl p-6 sm:p-7 shadow-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-900 dark:text-white">¿Eliminar la suplencia?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-300 mt-2">
            {suplencia && (
              <>
                <strong className="text-slate-900 dark:text-white">{suplencia.actividad.nombre}</strong> del {fechaCorta(suplencia.fechaClase)}.{" "}
                La clase vuelve a quedar a cargo de {nombreCompleto(suplencia.titular)} y deja de contar en los honorarios.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 gap-2 sm:gap-3">
          <AlertDialogCancel disabled={eliminar.isPending} className="h-11 px-6 rounded-xl font-bold text-sm border-slate-200 dark:border-slate-800">
            Cancelar
          </AlertDialogCancel>
          {/* Botón común y no AlertDialogAction: esa acción cierra el diálogo antes de saber si salió bien. */}
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={eliminar.isPending}
            className="h-11 px-6 rounded-xl bg-rose-600 font-bold text-sm text-white hover:bg-rose-700 transition-colors shadow-xs"
          >
            {eliminar.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-1.5" />}
            {eliminar.isPending ? "Eliminando…" : "Eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
