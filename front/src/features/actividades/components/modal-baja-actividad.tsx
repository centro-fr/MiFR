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
      <AlertDialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <AlertDialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 text-left dark:border-slate-800 dark:bg-white/5">
          <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            ¿Dar de baja esta actividad?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Estás por dar de baja <strong>{actividad.nombre}</strong>. La baja es lógica: sale del catálogo y queda en
            el historial. Si tiene horarios activos, primero hay que darlos de baja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 p-6">
          {errorBaja && (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
              <AlertDescription className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                {errorBaja}
              </AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter className="flex-row items-center justify-end gap-2.5 pt-2">
            <AlertDialogCancel asChild>
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Cancelar
              </Button>
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              disabled={dandoDeBaja}
              className="h-10 rounded-xl bg-rose-600 px-5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700"
            >
              {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
            </Button>
          </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
