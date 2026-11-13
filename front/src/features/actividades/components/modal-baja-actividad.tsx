import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { Actividad } from "@/types/actividad";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

interface Props {
  actividad: Actividad;
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// El back rechaza la baja (409) si la actividad todavía tiene horarios activos: ese
// mensaje llega en errorBaja.
export function ModalBajaActividad({ actividad, dandoDeBaja, errorBaja, onClose, onConfirm }: Props) {
  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <AlertDialogHeader className={CABECERA_MODAL}>
          <AlertDialogTitle className={TITULO_MODAL}>
            ¿Dar de baja esta actividad?
          </AlertDialogTitle>
          <AlertDialogDescription className={DESCRIPCION_MODAL}>
            Estás por dar de baja <strong>{actividad.nombre}</strong>. La baja es lógica: sale del catálogo y queda en
            el historial. Si tiene horarios activos, primero hay que darlos de baja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className={CUERPO_MODAL}>
          {errorBaja && (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
              <AlertDescription className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {errorBaja}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter className={PIE_MODAL}>
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={dandoDeBaja}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={dandoDeBaja}
            className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700"
          >
            {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
