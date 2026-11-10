import { useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAlumno } from "@/features/alumnos/hooks/use-alumnos";
import { esMontoDistinto } from "@/features/transferencias/api/transferencias-api";
import type { Transferencia } from "@/types/transferencia";
import { formatearPrecio } from "@/utils/moneda";

function Casilla({ marcada, onChange, children }: { marcada: boolean; onChange: (marcada: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-border p-3 text-sm leading-snug text-slate-800 dark:text-slate-100">
      <input type="checkbox" checked={marcada} onChange={(evento) => onChange(evento.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span>{children}</span>
    </label>
  );
}

interface Props {
  transferencia: Transferencia;
  aprobando: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (confirmarMontoDistinto: boolean) => void;
}

// US-17: aprobar deja al alumno "Al día" y, si era su primera cuota, le da el alta definitiva (US-07).
// Se pide marcar la verificación del extracto: es lo único que respalda la aprobación.
export function ModalAprobarTransferencia({ transferencia, aprobando, error, onClose, onConfirm }: Props) {
  const [verificada, setVerificada] = useState(false);
  const [montoConfirmado, setMontoConfirmado] = useState(false);
  // Ya cargada por el detalle: no vuelve a pedirse.
  const { data: ficha } = useAlumno(transferencia.alumno.id);
  const pideConfirmarMonto = esMontoDistinto(error);
  const esPrimeraCuota = ficha?.inscripcion?.estado === "PREINSCRIPTA";
  const { nombre, apellido } = transferencia.alumno;
  const puedeAprobar = verificada && (!pideConfirmarMonto || montoConfirmado) && !aprobando;
  const errorGeneral = error && !pideConfirmarMonto ? mensajeDeErrorApi(error, "No se pudo aprobar la transferencia.") : null;

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    if (puedeAprobar) onConfirm(pideConfirmarMonto && montoConfirmado);
  };

  return (
    <Dialog open onOpenChange={(abierta) => !abierta && !aprobando && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl sm:rounded-2xl dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={confirmar} className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-slate-100 bg-white px-6 py-4 pr-12 text-left dark:border-slate-800 dark:bg-slate-900">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Aprobar transferencia
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Se actualizará el estado del alumno a “Al día”. ¿Confirmás?
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/40">
              <span className="font-bold text-slate-900 dark:text-white">
                {nombre} {apellido}
              </span>
              <span className="font-extrabold tabular-nums text-slate-900 dark:text-white">{formatearPrecio(transferencia.monto)}</span>
            </div>

            {esPrimeraCuota && (
              <p className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-100">
                Es su primera cuota: al aprobarla se confirma el alta definitiva de {nombre}.
              </p>
            )}

            {pideConfirmarMonto && (
              <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
                <p role="status" className="text-sm text-amber-900 dark:text-amber-200">
                  {mensajeDeErrorApi(error, "El monto no coincide con el esperado.")}
                </p>
                <Casilla marcada={montoConfirmado} onChange={setMontoConfirmado}>
                  <strong>Confirmo que quiero aprobarla</strong> con el monto informado ({formatearPrecio(transferencia.monto)}).
                </Casilla>
              </div>
            )}

            <Casilla marcada={verificada} onChange={setVerificada}>
              Verifiqué el ingreso del dinero en mi extracto bancario.
            </Casilla>

            {errorGeneral && (
              <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">
                  {errorGeneral} La transferencia sigue pendiente: no se aplicó ningún cambio.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <Button
              type="button"
              variant="outline"
              disabled={aprobando}
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!puedeAprobar} className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark">
              {aprobando && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {aprobando ? "Aprobando..." : errorGeneral ? "Reintentar" : "Sí, aprobar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
