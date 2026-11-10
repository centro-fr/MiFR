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
      <AlertDialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-surface-low">
        <AlertDialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <AlertDialogTitle className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white tracking-tight">
            ¿Dar de baja esta actividad?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Estás por dar de baja <strong>{actividad.nombre}</strong>. La baja es lógica: sale del catálogo y queda en
            el historial. Si tiene horarios activos, primero hay que darlos de baja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorBaja && (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
              <AlertDescription className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {errorBaja}
              </AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={dandoDeBaja}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
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
