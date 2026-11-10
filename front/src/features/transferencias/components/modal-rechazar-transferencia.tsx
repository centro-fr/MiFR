import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  LARGO_MAXIMO_MOTIVO,
  MOTIVOS_FRECUENTES,
  motivoRechazoSchema,
} from "@/features/transferencias/schemas/transferencia";
import type { Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";

// El back guarda el motivo en una sola línea (textoSchema sin multilínea): un salto de línea
// escrito o pegado se pasa a espacio en vez de rechazarlo al enviar.
function enUnaLinea(texto: string): string {
  return texto.replace(/[\r\n]+/g, " ");
}

function MotivosFrecuentes({ motivo, onElegir }: { motivo: string; onElegir: (motivo: string) => void }) {
  return (
    <div role="group" aria-label="Motivos frecuentes" className="flex flex-wrap gap-2">
      {MOTIVOS_FRECUENTES.map((frecuente) => (
        <button
          key={frecuente}
          type="button"
          aria-pressed={motivo === frecuente}
          onClick={() => onElegir(frecuente)}
          className={cn(
            "min-h-9 rounded-full border border-border px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-rose-300 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-primary dark:text-slate-200",
            motivo === frecuente && "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/50 dark:bg-rose-500/15 dark:text-rose-200",
          )}
        >
          {frecuente}
        </button>
      ))}
    </div>
  );
}

interface Props {
  transferencia: Transferencia;
  rechazando: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (motivo: string) => void;
}

// US-17: el rechazo exige un motivo; el alumno lo ve en "Mis transferencias".
export function ModalRechazarTransferencia({ transferencia, rechazando, error, onClose, onConfirm }: Props) {
  const [motivo, setMotivo] = useState("");
  const [errorMotivo, setErrorMotivo] = useState<string | null>(null);
  const nombre = `${transferencia.alumno.nombre} ${transferencia.alumno.apellido}`;
  const errorGeneral = error ? mensajeDeErrorApi(error, "No se pudo rechazar la transferencia.") : null;

  const cambiarMotivo = (texto: string) => {
    setMotivo(enUnaLinea(texto));
    setErrorMotivo(null);
  };

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = motivoRechazoSchema.safeParse(motivo);
    if (!resultado.success) {
      setErrorMotivo(resultado.error.issues[0].message);
      return;
    }
    onConfirm(resultado.data);
  };

  return (
    <Dialog open onOpenChange={(abierta) => !abierta && !rechazando && onClose()}>
      <DialogContent className="flex max-h-[90dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border bg-white p-0 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <form onSubmit={confirmar} noValidate className="flex flex-col flex-1 overflow-hidden">
          <DialogHeader className="shrink-0 border-b border-border bg-slate-50/70 px-6 py-4 pr-12 text-left dark:bg-white/5">
            <DialogTitle className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl dark:text-white">
              Rechazar transferencia
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              La transferencia de {nombre} no se va a tomar como cuota abonada. El alumno verá el motivo en sus transferencias.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="motivo-rechazo" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Motivo del rechazo
                <span className="text-rose-600" aria-hidden="true"> *</span>
                <span className="sr-only"> (obligatorio)</span>
              </Label>
              <MotivosFrecuentes motivo={motivo} onElegir={cambiarMotivo} />
              <Textarea
                id="motivo-rechazo"
                value={motivo}
                maxLength={LARGO_MAXIMO_MOTIVO}
                rows={3}
                placeholder="Elegí uno de los motivos o escribí otro…"
                onChange={(evento) => cambiarMotivo(evento.target.value)}
                aria-invalid={errorMotivo !== null}
                aria-describedby={errorMotivo ? "motivo-rechazo-contador motivo-rechazo-error" : "motivo-rechazo-contador"}
                className="min-h-22 resize-y rounded-xl border-slate-200 bg-white text-sm dark:border-white/15 dark:bg-transparent"
              />
              <p id="motivo-rechazo-contador" className="text-right text-xs text-muted-foreground">
                {motivo.length}/{LARGO_MAXIMO_MOTIVO}
              </p>
              {errorMotivo && (
                <p id="motivo-rechazo-error" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
                  {errorMotivo}
                </p>
              )}
            </div>

            {errorGeneral && (
              <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
                <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">
                  {errorGeneral} La transferencia sigue pendiente: no se aplicó ningún cambio.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="shrink-0 flex flex-row items-center justify-end gap-2 border-t border-border bg-slate-50/70 px-6 py-4 dark:bg-white/5">
            <Button
              type="button"
              variant="outline"
              disabled={rechazando}
              onClick={onClose}
              className="rounded-xl border-slate-200 bg-white px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={rechazando} className="rounded-xl bg-rose-600 px-4 font-bold text-white shadow-md hover:bg-rose-700">
              {rechazando && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {rechazando ? "Rechazando..." : errorGeneral ? "Reintentar" : "Rechazar transferencia"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
