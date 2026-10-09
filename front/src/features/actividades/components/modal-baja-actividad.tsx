import { TriangleAlert } from "lucide-react";
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
      <AlertDialogContent className="max-w-md space-y-4 rounded-2xl border-slate-200 p-6 shadow-2xl sm:rounded-2xl dark:border-white/10 dark:bg-surface-low">
        <AlertDialogHeader className="space-y-4">
          <div aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 font-black text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
            <TriangleAlert className="h-5 w-5" />
          </div>
          <div>
            <AlertDialogTitle className="text-base font-extrabold text-[#181C26] dark:text-white">
              ¿Dar de baja esta actividad?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Estás por dar de baja <strong>{actividad.nombre}</strong>. La baja es lógica: sale del catálogo y queda en
              el historial. Si tiene horarios activos, primero hay que darlos de baja.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        {errorBaja && (
          <Alert className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
            <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">
              {errorBaja}
            </AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter className="flex-row items-center justify-end gap-2 pt-2">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] rounded-xl border-slate-200 px-4 text-sm font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={dandoDeBaja}
            className="min-h-[44px] rounded-xl bg-rose-600 px-4 text-sm font-bold text-white shadow-md hover:bg-rose-700"
          >
            {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
