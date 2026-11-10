import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
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
    <div className="sticky -bottom-5 -mx-5 -mb-5 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5 sm:-bottom-6 sm:-mx-6 sm:-mb-6">
      <Button
        type="button"
        variant="outline"
        onClick={onCancelar}
        disabled={guardando}
        className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        disabled={guardando}
        className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
      >
        {guardando && <Loader2 aria-hidden="true" className="size-4 animate-spin mr-1.5" />}
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
        className={cn("flex max-h-[90dvh] flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low", ancho === "amplio" ? "sm:max-w-3xl" : "sm:max-w-lg")}
      >
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">{titulo}</DialogTitle>
          <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">{descripcion}</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}
