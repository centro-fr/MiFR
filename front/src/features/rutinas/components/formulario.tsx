import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/utils/cn";

// Piezas que comparten los formularios de rutina y de medición, con el mismo estilo que el diálogo de
// tarifas de honorarios: en el celular se abren desde abajo y el pie con Guardar queda siempre a mano.

export function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
      {mensaje}
    </p>
  );
}

export function Obligatorio() {
  return (
    <span aria-hidden="true" className="text-rose-600">
      *
    </span>
  );
}

interface PropsPie {
  guardando: boolean;
  textoGuardar: string;
  onCancelar: () => void;
}

/** El -bottom compensa el relleno del contenedor que scrollea, para que no se vea el contenido por debajo. */
export function PieDelFormulario({ guardando, textoGuardar, onCancelar }: PropsPie) {
  return (
    <div className="sticky -bottom-5 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-border bg-white px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:-bottom-6 sm:-mx-6 sm:-mb-6 sm:flex-row sm:justify-end sm:px-6 sm:pb-6 dark:bg-surface-low">
      <Button type="button" variant="outline" onClick={onCancelar} disabled={guardando} className="min-h-11 rounded-xl font-bold">
        Cancelar
      </Button>
      <Button type="submit" disabled={guardando} className="min-h-11 rounded-xl bg-primary font-extrabold text-white hover:bg-primary-dark">
        {guardando && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {guardando ? "Guardando…" : textoGuardar}
      </Button>
    </div>
  );
}

interface PropsDialogo {
  abierto: boolean;
  titulo: string;
  descripcion: string;
  onClose: () => void;
  /** El de la rutina es más ancho: cada ejercicio va en una fila. */
  ancho?: "normal" | "amplio";
  children: ReactNode;
}

export function DialogoDeCarga({ abierto, titulo, descripcion, onClose, ancho = "normal", children }: PropsDialogo) {
  return (
    <Dialog open={abierto} onOpenChange={(abriendo) => !abriendo && onClose()}>
      <DialogContent
        bottomSheetOnMobile
        hideClose
        className={cn("gap-0 border-border bg-white p-0 dark:bg-surface-low", ancho === "amplio" ? "sm:max-w-3xl" : "sm:max-w-lg")}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 px-5 py-4 text-left sm:px-6 dark:border-slate-800">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Rutina y progreso</p>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">{titulo}</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">{descripcion}</DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar"
            className="size-11 shrink-0 rounded-full text-slate-500 pointer-fine:size-9 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
