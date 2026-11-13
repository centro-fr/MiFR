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
import { Button } from "@/components/ui/button";
import {
  BOTON_MODAL,
  BOTON_MODAL_PRINCIPAL,
  CABECERA_MODAL,
  CONTENIDO_MODAL,
  CUERPO_MODAL,
  DESCRIPCION_MODAL,
  PIE_MODAL,
  TITULO_MODAL,
} from "@/components/ui/estilos-modal";
import { cn } from "@/utils/cn";

interface Props {
  /** La pregunta: "¿Dar de baja a Lucía Gómez?". */
  titulo: string;
  /** Una línea con la consecuencia que importa. */
  descripcion?: ReactNode;
  textoConfirmar: string;
  /** Mientras se guarda: "Dando de baja…". */
  textoConfirmando?: string;
  confirmando?: boolean;
  /** El rechazo del back, en una línea bajo la descripción. */
  error?: string | null;
  /** Rojo para lo que borra o da de baja; rosa para lo que confirma un movimiento (rendir, abonar). */
  peligro?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
  /**
   * Cuando la operación no se puede hacer todavía (por ejemplo, la profesora tiene clases), en lugar
   * del botón de confirmar va esta acción ("Ir a Horarios") y Cancelar pasa a decir Cerrar.
   */
  accionAlternativa?: ReactNode;
}

/**
 * La confirmación de toda operación crítica (bajas, eliminaciones, movimientos de caja), con la misma
 * cabecera y pie que el resto de los modales y el contenido mínimo: la pregunta, una línea con la
 * consecuencia y, si el back la rechazó, el motivo.
 */
export function ConfirmarAccion({
  titulo,
  descripcion,
  textoConfirmar,
  textoConfirmando,
  confirmando = false,
  error,
  peligro = true,
  onConfirmar,
  onCancelar,
  accionAlternativa,
}: Props) {
  return (
    <AlertDialog open onOpenChange={(abierto) => !abierto && !confirmando && onCancelar()}>
      <AlertDialogContent className={cn(CONTENIDO_MODAL, "max-w-md")}>
        <AlertDialogHeader className={CABECERA_MODAL}>
          <AlertDialogTitle className={TITULO_MODAL}>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription className={DESCRIPCION_MODAL}>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        {error && (
          <div className={CUERPO_MODAL}>
            <p role="alert" className="text-sm font-medium text-rose-600 dark:text-rose-400">
              {error}
            </p>
          </div>
        )}
        <AlertDialogFooter className={PIE_MODAL}>
          <AlertDialogCancel asChild>
            <Button type="button" variant="outline" disabled={confirmando} className={cn(BOTON_MODAL, "mt-0")}>
              {accionAlternativa ? "Cerrar" : "Cancelar"}
            </Button>
          </AlertDialogCancel>
          {accionAlternativa ?? (
            <Button
              type="button"
              disabled={confirmando}
              onClick={onConfirmar}
              className={peligro ? cn(BOTON_MODAL, "bg-rose-600 text-white hover:bg-rose-700") : BOTON_MODAL_PRINCIPAL}
            >
              {confirmando ? (textoConfirmando ?? textoConfirmar) : textoConfirmar}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
