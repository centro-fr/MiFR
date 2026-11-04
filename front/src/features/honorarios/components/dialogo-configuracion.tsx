import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TarifasDelMes } from "@/features/honorarios/components/tarifas-del-mes";
import { DIA_DE_CIERRE } from "@/features/honorarios/utils/periodo";

interface Props {
  abierto: boolean;
  periodo: string;
  onClose: () => void;
}

/**
 * Lo que se configura una sola vez: el porcentaje (uno para todos), la hora de suplencia de cada
 * profesor/a y cuándo se cierra el mes. Con eso, cada mes se calcula y se cierra solo.
 */
export function DialogoConfiguracion({ abierto, periodo, onClose }: Props) {
  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent bottomSheetOnMobile hideClose className="gap-0 border-border bg-white p-0 sm:max-w-2xl dark:bg-surface-low">
        <DialogHeader className="flex shrink-0 flex-row items-center justify-between border-b border-slate-100 px-5 py-4 text-left sm:px-6 dark:border-slate-800">
          <div className="min-w-0 pr-2">
            <p className="text-xs font-extrabold tracking-wider text-primary uppercase">Honorarios</p>
            <DialogTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl dark:text-white">Configuración</DialogTitle>
            <DialogDescription className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              Se carga una vez. Después cada mes se calcula y se cierra solo.
            </DialogDescription>
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
          {abierto && <TarifasDelMes periodo={periodo} embebido />}
          <section aria-labelledby="config-cierre" className="border-t border-border pt-5">
            <h3 id="config-cierre" className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
              Cierre del mes
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Se cierra solo el día {DIA_DE_CIERRE} del mes siguiente. Hasta ese día se sigue actualizando, para que entren las
              transferencias que se aprueban tarde. Después los montos quedan fijos.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
