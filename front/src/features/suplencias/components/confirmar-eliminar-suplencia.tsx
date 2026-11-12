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
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

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
      <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <AlertDialogHeader className={CABECERA_MODAL}>
          <AlertDialogTitle className={TITULO_MODAL}>
            ¿Eliminar la suplencia?
          </AlertDialogTitle>
          <AlertDialogDescription className={DESCRIPCION_MODAL}>
            {suplencia && (
              <>
                <strong className="text-slate-900 dark:text-white">{suplencia.actividad.nombre}</strong> del {fechaCorta(suplencia.fechaClase)}.{" "}
                La clase vuelve a quedar a cargo de {nombreCompleto(suplencia.titular)} y deja de contar en los honorarios.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={PIE_MODAL}>
          <AlertDialogCancel disabled={eliminar.isPending} className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Cancelar
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={() => void confirmar()}
            disabled={eliminar.isPending}
            className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700"
          >
            {eliminar.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-1.5" />}
            {eliminar.isPending ? "Eliminando…" : "Eliminar"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
