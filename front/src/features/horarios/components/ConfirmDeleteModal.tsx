import type { Horario } from '../../../types/horarios';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  horario: Horario | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ isOpen, horario, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!horario) return null;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <AlertDialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        {/* Cabecera */}
        <AlertDialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            ¿Eliminar clase del cronograma?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            La baja es lógica: el horario sale del cronograma y queda en el historial.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2.5 rounded-2xl border border-border bg-slate-50 dark:bg-white/5 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div className="flex items-center justify-between gap-3 font-bold text-foreground">
              <span className="text-base">{horario.actividadNombre}</span>
              <span className="text-sm text-slate-900 dark:text-white">{horario.diaSemana}</span>
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm">
              Profesora: <strong className="text-foreground">{horario.profesoraNombre}</strong>
            </div>
            <div className="text-muted-foreground text-xs sm:text-sm">
              Franja horaria: <strong className="text-foreground">{horario.horaInicio} a {horario.horaFin} hs</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              onClick={onConfirm}
              className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700"
            >
              <Trash2 className="size-4 mr-1.5" />
              <span>Confirmar baja</span>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
