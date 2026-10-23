import { useState } from "react";
import { Banknote, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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
        hideClose
        className="w-[96vw] sm:w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto"
      >
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Banknote className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {esLote ? "Rendición de lote" : "Rendición individual"}
                </p>
                <DialogTitle className="text-lg font-black text-slate-900 tracking-tight dark:text-white">
                  {titulo}
                </DialogTitle>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              disabled={procesando}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>

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

          {/* Acciones */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCerrar}
              disabled={procesando}
              className="h-10 rounded-xl px-4 text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmar}
              disabled={procesando}
              className="h-10 rounded-xl bg-primary px-5 text-xs font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
