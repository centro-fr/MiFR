import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TarifasDelMes } from "@/features/honorarios/components/tarifas-del-mes";
import { useDiaDeCierre } from "@/features/honorarios/hooks/use-dia-de-cierre";

interface Props {
  abierto: boolean;
  periodo: string;
  onClose: () => void;
}

function CierreDelMes() {
  const { diaDeCierre, isPending, isError } = useDiaDeCierre();
  if (isPending) return <Skeleton className="mt-2 h-10 w-full rounded-lg" />;
  if (isError) return <p className="mt-1 text-sm text-muted-foreground">No se pudo leer el día de cierre. Probá de nuevo en un momento.</p>;
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      Se cierra solo el día {diaDeCierre} del mes siguiente. Hasta ese día podés actualizarlo, para que entren las transferencias
      que se aprueban tarde. Al cerrarse se calcula por última vez y los montos quedan fijos.
    </p>
  );
}

/**
 * Lo que se configura una sola vez: el porcentaje (uno para todos) y la hora de suplencia de cada
 * profesor/a. También informa cuándo se cierra cada mes.
 */
export function DialogoConfiguracion({ abierto, periodo, onClose }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-border bg-white p-0 sm:max-w-2xl dark:bg-surface-low">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 px-5 py-4 text-left sm:px-6 dark:border-slate-800">
          <div className="min-w-0 pr-2">
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">Configuración</DialogTitle>
            <DialogDescription className="sr-only">Configuración de honorarios</DialogDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Cerrar la configuración"
            className="size-11 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 pointer-fine:size-9 dark:hover:bg-slate-800"
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
          <TarifasDelMes periodo={periodo} embebido />
          <section aria-labelledby="config-cierre" className="border-t border-border pt-5">
            <h3 id="config-cierre" className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              Cierre del mes
            </h3>
            <CierreDelMes />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
