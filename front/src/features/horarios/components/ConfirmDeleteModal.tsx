import type { Horario } from '../../../types/horarios';
import { AlertTriangle, Trash2 } from 'lucide-react';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  horario: Horario | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({ isOpen, horario, onClose, onConfirm }: ConfirmDeleteModalProps) {
  if (!horario) return null;

  const alumnosInscriptos = (horario as unknown as { inscriptos_count?: number; inscriptosCount?: number })?.inscriptos_count ??
    (horario as unknown as { inscriptos_count?: number; inscriptosCount?: number })?.inscriptosCount ?? 0;

  const tieneAlumnosActivos = alumnosInscriptos > 0;

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <AlertDialogContent className="flex max-h-[90dvh] max-w-lg flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Cabecera */}
        <AlertDialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <AlertDialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
            {tieneAlumnosActivos ? 'Programar baja de horario' : '¿Eliminar clase del cronograma?'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            {tieneAlumnosActivos
              ? 'Se aplicará cuando venzan las cuotas de los alumnos inscriptos actuales.'
              : 'La clase no tiene alumnos: la baja sale del cronograma de forma inmediata.'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40 p-4 text-sm text-slate-700 dark:text-slate-200">
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

          {tieneAlumnosActivos ? (
            <Alert className="rounded-2xl border-amber-200 bg-amber-50/80 p-4 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 text-xs">
                  <p className="font-bold text-amber-900 dark:text-amber-100">
                    Tiene {alumnosInscriptos} alumno(s) activo(s) inscripto(s)
                  </p>
                  <AlertDescription className="space-y-1.5 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
                    <p>
                      • La baja definitiva de este horario se hará efectiva al vencer la cuota de cada alumno actual para respetar sus clases abonadas.
                    </p>
                    <p>
                      • No se permitirá seguir cargando ni inscribiendo nuevos alumnos en este horario.
                    </p>
                    <p>
                      • Si al eliminarse este horario un alumno queda sin horarios para su plan, pasará automáticamente a estado de baja.
                    </p>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          ) : (
            <p className="text-xs text-muted-foreground">
              Al confirmar, el horario quedará inactivo en el cronograma y conservado en el historial.
            </p>
          )}
        </div>

        {/* Footer */}
        <AlertDialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
              <span>{tieneAlumnosActivos ? 'Programar baja al vencimiento' : 'Confirmar baja'}</span>
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
