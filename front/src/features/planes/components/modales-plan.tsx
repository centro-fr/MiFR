import type { ReactNode } from "react";
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
import { cn } from "@/utils/cn";

interface PropsConfirmacion {
  titulo: string;
  descripcion: string;
  textoConfirmar: string;
  textoProcesando: string;
  procesando: boolean;
  peligroso?: boolean;
  error?: string | null;
  children?: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
}

function ModalConfirmacion(props: PropsConfirmacion) {
  const { titulo, descripcion, textoConfirmar, textoProcesando, procesando, peligroso = false, error, children, onClose, onConfirm } = props;
  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !procesando) onClose();
      }}
    >
      <AlertDialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <AlertDialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 text-left dark:border-slate-800 dark:bg-white/5">
          <div className="space-y-0.5">
            <AlertDialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">{titulo}</AlertDialogTitle>
            <AlertDialogDescription className="text-xs sm:text-sm text-muted-foreground font-medium">{descripcion}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {children}
          {error && (
            <Alert role="alert" className="rounded-xl border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
              <AlertDescription className="text-sm text-amber-900 dark:text-amber-200">{error}</AlertDescription>
            </Alert>
          )}
        </div>
        <AlertDialogFooter className="shrink-0 flex-row items-center justify-end gap-2 border-t border-border px-6 py-4">
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={procesando} className="rounded-xl border-slate-200 px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10">
              Cancelar
            </Button>
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={procesando}
            className={cn("rounded-xl px-4 font-bold text-white shadow-md", peligroso ? "bg-rose-600 hover:bg-rose-700" : "bg-primary hover:bg-primary-dark")}
          >
            {procesando ? textoProcesando : textoConfirmar}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface PropsFrecuencia {
  antes: string;
  despues: string;
  guardando: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

// La frecuencia define cuántos horarios puede elegir quien ya está inscripto: se confirma aparte.
export function ModalCambioFrecuencia({ antes, despues, guardando, onClose, onConfirm }: PropsFrecuencia) {
  return (
    <ModalConfirmacion
      titulo="¿Cambiar la frecuencia semanal?"
      descripcion="La nueva frecuencia define cuántas clases por semana pueden tomar los alumnos de este plan a partir de ahora."
      textoConfirmar="Confirmar cambios"
      textoProcesando="Guardando..."
      procesando={guardando}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p className="rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-800 dark:bg-white/5 dark:text-slate-200">
        {antes} <span className="text-muted-foreground">→</span> <span className="text-primary-dark dark:text-pink-300">{despues}</span>
      </p>
    </ModalConfirmacion>
  );
}

interface PropsBaja {
  nombre: string;
  dandoDeBaja: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

// US-11: un plan nunca se elimina. La baja es lógica y no se puede deshacer desde acá.
export function ModalBajaPlan({ nombre, dandoDeBaja, error, onClose, onConfirm }: PropsBaja) {
  return (
    <ModalConfirmacion
      titulo={`¿Dar de baja "${nombre}"?`}
      descripcion="Deja de ofrecerse a nuevos alumnos. Quienes ya lo tienen lo conservan, junto con sus cuotas e historial. Después no se puede volver a activar: si lo necesitás de nuevo, creá un plan nuevo."
      textoConfirmar="Dar de baja"
      textoProcesando="Dando de baja..."
      procesando={dandoDeBaja}
      peligroso
      error={error}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}
