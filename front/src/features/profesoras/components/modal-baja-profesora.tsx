import { TriangleAlert } from "lucide-react";
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
      <AlertDialogContent className="max-w-md space-y-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white p-6 shadow-2xl dark:bg-slate-900">
        <AlertDialogHeader className="space-y-3">
          <div
            aria-hidden="true"
            className="flex size-11 items-center justify-center rounded-2xl bg-rose-50 font-black text-rose-600 dark:bg-rose-950/60 dark:text-rose-300"
          >
            <TriangleAlert className="size-6" />
          </div>
          <div>
            <AlertDialogTitle className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              ¿Dar de baja a esta profesora?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              Estás por dar de baja el perfil de <strong>{profesora.nombreCompleto}</strong>. La baja es estrictamente lógica:
              se preserva todo su historial de clases dictadas, suplencias e informes de honorarios, pero dejará de estar disponible
              para la asignación de nuevos horarios.
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

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
      </AlertDialogContent>
    </AlertDialog>
  );
}
