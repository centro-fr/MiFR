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
      <AlertDialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <AlertDialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 text-left dark:border-slate-800 dark:bg-white/5">
          <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
            ¿Dar de baja a este/a profesor/a?
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
            Estás por dar de baja el perfil de <strong>{profesora.nombreCompleto}</strong>. La baja es estrictamente lógica:
            se preserva todo su historial de clases dictadas, suplencias e informes de honorarios, pero dejará de estar disponible
            para la asignación de nuevos horarios.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 p-6">

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

        <AlertDialogFooter className="flex-row items-center justify-end gap-2.5 pt-2">
          <AlertDialogCancel asChild>
            <Button
              type="button"
              variant="outline"
              disabled={dandoDeBaja}
              className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tieneHorarios ? "Cerrar" : "Cancelar"}
            </Button>
          </AlertDialogCancel>

          {tieneHorarios ? (
            <Button
              asChild
              className="h-10 rounded-xl bg-primary px-4 text-xs font-bold text-white shadow-xs hover:bg-primary-dark"
            >
              <Link to="/app/horarios">Ir a Horarios</Link>
            </Button>
          ) : (
            <Button
              type="button"
              variant="destructive"
              disabled={dandoDeBaja}
              onClick={onConfirm}
              className="h-10 rounded-xl px-4 text-xs font-bold shadow-xs"
            >
              {dandoDeBaja ? "Dando de baja..." : "Confirmar baja"}
            </Button>
          )}
        </AlertDialogFooter>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
