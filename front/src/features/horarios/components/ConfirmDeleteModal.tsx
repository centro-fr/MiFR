import type { Horario } from '../../../types/horarios';
import { Trash2, X } from 'lucide-react';
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
      <AlertDialogContent className="max-w-[640px] gap-0 overflow-hidden rounded-3xl border-border p-0 shadow-2xl sm:rounded-3xl">
        {/* Cabecera */}
        <AlertDialogHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b border-border bg-slate-50 dark:bg-white/5 px-6 py-5 md:px-8 md:py-6">
          <div className="space-y-1">
            <AlertDialogTitle className="text-xl font-extrabold tracking-tight text-dark dark:text-white md:text-2xl">
              ¿Eliminar clase del cronograma?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              La baja es lógica: el horario sale del cronograma y queda en el historial.
            </AlertDialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="h-9 w-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
        </AlertDialogHeader>

        {/* Cuerpo */}
        <div className="p-6 md:p-8">
          <div className="space-y-2.5 rounded-2xl border border-border bg-slate-50 dark:bg-white/5 p-5 text-sm text-slate-700 dark:text-slate-200 md:p-6 md:text-base">
            <div className="flex items-center justify-between gap-3 font-bold text-foreground">
              <span className="text-base md:text-lg">{horario.actividadNombre}</span>
              <span className="text-sm text-slate-900 dark:text-white md:text-base">{horario.diaSemana}</span>
            </div>
            <div className="text-muted-foreground">
              Profesora: <strong className="text-foreground">{horario.profesoraNombre}</strong>
            </div>
            <div className="text-muted-foreground">
              Franja horaria: <strong className="text-foreground">{horario.horaInicio} a {horario.horaFin} hs</strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-border bg-slate-50 dark:bg-white/5 p-6 sm:flex-row sm:items-center sm:justify-end md:p-8">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="ghost"
              className="min-h-[48px] px-5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/15 hover:text-slate-800 md:text-base"
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirm}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 px-7 text-sm font-bold shadow-md md:text-base [&_svg]:size-5"
            >
              <Trash2 className="h-5 w-5" />
              <span>Confirmar Baja</span>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
