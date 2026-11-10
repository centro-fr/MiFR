import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatearPrecio } from "@/utils/moneda";
import type { CobroSinRendir, TotalDeProfesora } from "../schemas/rendicion";

export interface DatosRendicionIndividual {
  tipo: "INDIVIDUAL";
  cobro: CobroSinRendir;
}

export interface DatosRendicionLote {
  tipo: "LOTE";
  profesora: TotalDeProfesora;
}

export type DestinoRendicion = DatosRendicionIndividual | DatosRendicionLote;

interface Props {
  open: boolean;
  onClose: () => void;
  destino: DestinoRendicion | null;
  onConfirmar: (observaciones?: string) => Promise<void> | void;
  procesando: boolean;
}

export function ModalConfirmarRendicion({
  open,
  onClose,
  destino,
  onConfirmar,
  procesando,
}: Props) {
  const [observaciones, setObservaciones] = useState("");

  if (!destino) return null;

  const esLote = destino.tipo === "LOTE";
  const titulo = esLote
    ? `Rendir efectivo de ${destino.profesora.nombre} ${destino.profesora.apellido}`
    : `Rendir cobro de ${destino.cobro.alumno.nombre} ${destino.cobro.alumno.apellido}`;

  const monto = esLote ? destino.profesora.total : destino.cobro.monto;
  const cantidad = esLote ? destino.profesora.cantidad : 1;

  const handleCerrar = () => {
    if (procesando) return;
    setObservaciones("");
    onClose();
  };

  const handleConfirmar = async () => {
    try {
      await onConfirmar(observaciones.trim() || undefined);
      setObservaciones("");
    } catch {
      // El error ya es manejado por el toast en el panel contenedor
    }
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && handleCerrar()}>
      <DialogContent
        className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low"
      >
        {/* Header */}
        <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
          <DialogTitle className="text-xl font-black text-slate-900 tracking-tight sm:text-2xl dark:text-white">
            {titulo}
          </DialogTitle>
          <DialogDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
            {esLote ? "Rendición de lote" : "Rendición individual"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Importe y resumen */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800/80 dark:bg-slate-800/40">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                  Monto a rendir
                </span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">
                  {formatearPrecio(monto)}
                </span>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
                {cantidad === 1 ? "1 cobro" : `${cantidad} cobros`}
              </span>
            </div>

            {!esLote && (
              <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300 space-y-1">
                <div className="flex justify-between">
                  <span>Plan:</span>
                  <span className="font-semibold">{destino.cobro.plan}</span>
                </div>
                <div className="flex justify-between">
                  <span>Profesora que cobró:</span>
                  <span className="font-semibold">
                    {destino.cobro.profesora.nombre} {destino.cobro.profesora.apellido}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Campo de observaciones */}
          <div className="space-y-1.5">
            <label
              htmlFor="observaciones-rendicion"
              className="block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              Observaciones (opcional)
            </label>
            <Input
              id="observaciones-rendicion"
              placeholder="Ej: Entregó dinero en mano en recepción"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              disabled={procesando}
              className="h-10 text-xs rounded-xl"
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Al confirmar, el dinero se marcará como rendido en caja y dejará de figurar como
            pendiente.
          </p>

        </div>

        {/* Acciones */}
        <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5">
          <Button
            type="button"
            variant="outline"
            onClick={handleCerrar}
            disabled={procesando}
            className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleConfirmar}
            disabled={procesando}
            className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark"
          >
            {procesando ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Rindiendo...
              </>
            ) : (
              "Confirmar rendición"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
