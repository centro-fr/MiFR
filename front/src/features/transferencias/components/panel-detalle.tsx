import { memo } from "react";
import { Inbox } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { DetalleTransferencia } from "@/features/transferencias/components/detalle-transferencia";
import type { Transferencia } from "@/types/transferencia";

interface Props {
  transferencia: Transferencia | undefined;
  /** En escritorio el detalle queda fijo al costado de la lista; si no, se abre como drawer. */
  esEscritorio: boolean;
  onCerrar: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
}

// memo: escribir en la búsqueda re-renderiza la página en cada tecla, y el detalle (lo más pesado
// de la pantalla) no cambia. Medido con CPU 4x: una tarea larga por tecla sin memo.
export const PanelDetalle = memo(function PanelDetalle({ transferencia, esEscritorio, onCerrar, onAprobar, onRechazar }: Props) {
  const detalle = transferencia && (
    // key: al cambiar de transferencia el panel arranca de cero (scroll arriba).
    <DetalleTransferencia key={transferencia.id} transferencia={transferencia} onAprobar={onAprobar} onRechazar={onRechazar} />
  );

  if (esEscritorio) {
    return (
      <Card
        aria-label="Detalle de la transferencia"
        className="sticky top-4 flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden rounded-lg border-border bg-white shadow-sm dark:bg-surface-low"
      >
        {detalle ?? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-muted-foreground">
            <Inbox aria-hidden="true" className="size-8" />
            Seleccioná una transferencia para ver su detalle.
          </div>
        )}
      </Card>
    );
  }

  return (
    <Sheet open={transferencia !== undefined} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md dark:bg-surface-low">
        <SheetTitle className="sr-only">Detalle de la transferencia</SheetTitle>
        <SheetDescription className="sr-only">Datos de la transferencia, avisos y acciones para aprobarla o rechazarla.</SheetDescription>
        {detalle}
      </SheetContent>
    </Sheet>
  );
});
