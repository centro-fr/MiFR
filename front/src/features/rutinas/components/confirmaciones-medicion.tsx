import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { mensajeDeErrorApi } from "@/api/errores";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatearFecha } from "@/features/alumnos/utils/formato-ficha";
import { useDarDeBajaMedicion } from "@/features/rutinas/hooks/use-rutinas";
import { resumenDeMedidas } from "@/features/rutinas/utils/formato-rutinas";
import type { Medicion } from "@/types/rutinas";
import { cn } from "@/utils/cn";
import { CABECERA_MODAL, CONTENIDO_MODAL, DESCRIPCION_MODAL, PIE_MODAL, TITULO_MODAL } from "@/components/ui/estilos-modal";

// Las dos preguntas que se le hacen a la profesora sobre una medición ya cargada (US-27).

const BOTON = "min-h-11 rounded-xl px-5 font-bold";

interface PropsConfirmacion {
  abierto: boolean;
  titulo: string;
  descripcion: ReactNode;
  ocupado: boolean;
  onCancelar: () => void;
  /** Los botones de confirmación, a la derecha de Cancelar. */
  children: ReactNode;
}

function Confirmacion({ abierto, titulo, descripcion, ocupado, onCancelar, children }: PropsConfirmacion) {
  return (
    <AlertDialog open={abierto} onOpenChange={(abriendo) => !abriendo && !ocupado && onCancelar()}>
      <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <AlertDialogHeader className={CABECERA_MODAL}>
          <AlertDialogTitle className={TITULO_MODAL}>{titulo}</AlertDialogTitle>
          <AlertDialogDescription className={DESCRIPCION_MODAL}>{descripcion}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className={PIE_MODAL}>
          <AlertDialogCancel disabled={ocupado} className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">
            Cancelar
          </AlertDialogCancel>
          {children}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function LaMedicion({ medicion }: { medicion: Medicion }) {
  return (
    <>
      <strong className="text-slate-900 dark:text-white">{formatearFecha(medicion.fecha)}</strong>: {resumenDeMedidas(medicion.medidas)}.{" "}
    </>
  );
}

interface PropsMismoDia {
  /** La que ya está cargada con esa fecha; null con la confirmación cerrada. */
  existente: Medicion | null;
  onReemplazar: (existente: Medicion) => void;
  onGuardarOtra: () => void;
  onCancelar: () => void;
}

/**
 * El back no advierte las mediciones duplicadas: antes de registrar otra con la misma fecha se pregunta si
 * reemplaza a la que ya está o se suma. Cierra antes de guardar: el progreso se ve en el formulario.
 */
export function ConfirmarMedicionDelMismoDia({ existente, onReemplazar, onGuardarOtra, onCancelar }: PropsMismoDia) {
  return (
    <Confirmacion
      abierto={existente !== null}
      titulo="Ya hay una medición de ese día"
      descripcion={
        <>
          {existente && <LaMedicion medicion={existente} />}
          Podés reemplazarla con lo que acabás de cargar o guardar esta como otra medición del mismo día.
        </>
      }
      ocupado={false}
      onCancelar={onCancelar}
    >
      <Button type="button" variant="outline" onClick={onGuardarOtra} className={BOTON}>
        Guardar otra
      </Button>
      <Button
        type="button"
        onClick={() => existente && onReemplazar(existente)}
        className={cn(BOTON, "bg-primary font-extrabold text-white hover:bg-primary-dark")}
      >
        Reemplazarla
      </Button>
    </Confirmacion>
  );
}

interface PropsBaja {
  idAlumno: number;
  /** La medición a dar de baja; null con la confirmación cerrada. */
  medicion: Medicion | null;
  onClose: () => void;
}

export function ConfirmarBajaMedicion({ idAlumno, medicion, onClose }: PropsBaja) {
  const darDeBaja = useDarDeBajaMedicion(idAlumno);

  async function confirmar() {
    if (!medicion) return;
    try {
      await darDeBaja.mutateAsync(medicion.id);
      toast.success("Medición dada de baja.");
      onClose();
    } catch (error) {
      toast.error(mensajeDeErrorApi(error, "No se pudo dar de baja la medición."));
    }
  }

  return (
    <Confirmacion
      abierto={medicion !== null}
      titulo="¿Seguro que desea realizar la baja?"
      descripcion={
        <>
          {medicion && <LaMedicion medicion={medicion} />}
          Deja de verse en su historial y en su progreso, y ya no se puede corregir. Queda registrado quién la dio de baja.
        </>
      }
      ocupado={darDeBaja.isPending}
      onCancelar={onClose}
    >
      {/* Botón común y no AlertDialogAction: esa acción cierra el diálogo antes de saber si salió bien. */}
      <Button
        type="button"
        onClick={() => void confirmar()}
        disabled={darDeBaja.isPending}
        className={cn(BOTON, "bg-rose-600 text-white hover:bg-rose-700")}
      >
        {darDeBaja.isPending && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
        {darDeBaja.isPending ? "Dando de baja…" : "Dar de baja"}
      </Button>
    </Confirmacion>
  );
}
