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
import { Badge } from '@/components/ui/badge';
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
      <AlertDialogContent className="max-w-[640px] gap-0 overflow-hidden rounded-3xl border-slate-200 p-0 shadow-2xl sm:rounded-3xl">
        {/* Cabecera */}
        <AlertDialogHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-slate-200 bg-slate-50 px-6 py-5 md:px-8 md:py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-red-200 bg-red-100 text-red-600 md:h-14 md:w-14">
              <Trash2 className="h-6 w-6 stroke-[2.5] md:h-7 md:w-7" />
            </div>
            <div>
              <Badge variant="outline" className="rounded-md border-red-200 bg-red-100 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-red-700">
                Baja de Horario
              </Badge>
              <AlertDialogTitle className="mt-2 text-xl font-extrabold tracking-tight text-[#181C26] md:text-2xl">
                ¿Eliminar clase del cronograma?
              </AlertDialogTitle>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="h-11 w-11 shrink-0 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 [&_svg]:size-5"
          >
            <X className="h-5 w-5" />
          </Button>
        </AlertDialogHeader>

        {/* Cuerpo */}
        <div className="space-y-5 p-6 md:p-8">
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700 md:p-6 md:text-base">
            <div className="flex items-center justify-between gap-3 font-bold text-slate-900">
              <span className="text-base md:text-lg">{horario.actividadNombre}</span>
              <span className="text-sm text-[#BC1266] md:text-base">{horario.diaSemana}</span>
            </div>
            <div className="text-slate-500">
              Profesora: <strong className="text-slate-800">{horario.profesoraNombre}</strong>
            </div>
            <div className="text-slate-500">
              Franja horaria: <strong className="text-slate-800">{horario.horaInicio} a {horario.horaFin} hs</strong>
            </div>
          </div>

          <AlertDialogDescription className="text-sm leading-relaxed text-slate-500 md:text-base">
            La baja es lógica: el horario sale del cronograma y queda en el historial.
          </AlertDialogDescription>
        </div>

        {/* Footer */}
        <AlertDialogFooter className="flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 p-6 sm:flex-row sm:items-center sm:justify-end md:p-8">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="ghost"
              className="min-h-[48px] px-5 text-sm font-bold text-slate-600 hover:bg-slate-200/60 hover:text-slate-800 md:text-base"
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
