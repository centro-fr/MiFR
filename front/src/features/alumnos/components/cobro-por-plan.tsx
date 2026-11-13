import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CABECERA_MODAL, CONTENIDO_MODAL, CUERPO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import type { InscripcionDeAlumno } from "@/features/alumnos/schemas/alumno";
import { cn } from "@/utils/cn";

// Con varios planes vigentes, el cobro se registra contra una inscripción puntual que se elige antes
// de abrir el formulario.

interface ModalElegirPlanACobrarProps {
  inscripciones: InscripcionDeAlumno[];
  onElegir: (inscripcion: InscripcionDeAlumno) => void;
  onCancelar: () => void;
}

export function ModalElegirPlanACobrar({ inscripciones, onElegir, onCancelar }: ModalElegirPlanACobrarProps) {
  return (
    <Dialog open onOpenChange={(abierto) => !abierto && onCancelar()}>
      <DialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <DialogHeader className={CABECERA_MODAL}>
          <DialogTitle className={TITULO_MODAL}>Registrar cobro</DialogTitle>
          <DialogDescription className={DESCRIPCION_MODAL}>Elegí el plan al cual querés registrar el cobro</DialogDescription>
        </DialogHeader>
        <div className={cn(CUERPO_MODAL, "space-y-2")}>
          {inscripciones.map((inscripcion) => (
            <button
              key={inscripcion.id_inscripcion}
              type="button"
              onClick={() => onElegir(inscripcion)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/15 dark:hover:border-primary dark:hover:bg-primary/10"
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-bold text-slate-900 dark:text-white">{inscripcion.plan.nombre}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{inscripcion.profesora}</span>
              </span>
              <BadgeSituacionCuota situacion={inscripcion.situacion_cuota} className="shrink-0" />
            </button>
          ))}
        </div>
        <DialogFooter className={PIE_MODAL}>
          <Button
            type="button"
            variant="outline"
            onClick={onCancelar}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
