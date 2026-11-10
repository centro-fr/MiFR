import { Link } from "react-router-dom";
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
import type { Profesora } from "@/features/profesoras/schemas/profesora";

interface Props {
  profesora: Profesora;
  cantidadHorarios?: number;
  actividadesNombres?: string[];
  dandoDeBaja: boolean;
  errorBaja: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export function ModalBajaProfesora({
  profesora,
  cantidadHorarios = 0,
  actividadesNombres = [],
  dandoDeBaja,
  errorBaja,
  onClose,
  onConfirm,
}: Props) {
  const tieneHorarios = cantidadHorarios > 0;
  const actividadesTexto =
    actividadesNombres.slice(0, 3).join(", ") + (actividadesNombres.length > 3 ? "..." : "");

  return (
    <AlertDialog
      open
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <AlertDialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <AlertDialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
          <AlertDialogTitle className="text-xl font-black text-slate-900 sm:text-2xl dark:text-white tracking-tight">
            ¿Dar de baja a este/a profesor/a?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-slate-600 dark:text-slate-400">
            Estás por dar de baja el perfil de <strong>{profesora.nombreCompleto}</strong>. La baja es estrictamente lógica:
            se preserva todo su historial de clases dictadas, suplencias e informes de honorarios, pero dejará de estar disponible
            para la asignación de nuevos horarios.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {tieneHorarios ? (
            <Alert className="rounded-2xl border-amber-300 bg-amber-50/90 p-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertDescription className="space-y-1.5 text-xs font-medium leading-relaxed">
                <p className="font-bold text-amber-900 dark:text-amber-100">
                  Tiene {cantidadHorarios} {cantidadHorarios === 1 ? "clase semanal asignada" : "clases semanales asignadas"}
                  {actividadesTexto ? ` (${actividadesTexto})` : ""}.
                </p>
                <p>
                  Para mantener la integridad del cronograma y no dejar clases sin docente a cargo, primero debés reasignar o dar de baja sus horarios en el Cronograma.
                </p>
              </AlertDescription>
            </Alert>
          ) : errorBaja ? (
            <Alert className="rounded-xl border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertDescription className="text-xs font-semibold">{errorBaja}</AlertDescription>
            </Alert>
          ) : null}
        </div>

        <AlertDialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={dandoDeBaja}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {tieneHorarios ? "Cerrar" : "Cancelar"}
            </Button>
          </AlertDialogCancel>

          {tieneHorarios ? (
            <Button
              asChild
              className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
            >
              <Link to="/app/horarios">Ir a Horarios</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={dandoDeBaja}
              onClick={onConfirm}
              className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700"
            >
              {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
