import { useState } from "react";
import { AlertCircle, DollarSign, Loader2, Send } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatearPrecio } from "@/utils/moneda";
import { useInformarTransferencia } from "../hooks/use-transferencias";
import { informarTransferenciaFormSchema } from "../schemas/transferencia";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idInscripcion: number;
  montoSugerido: number;
  nombrePlan: string;
}

function ahoraEnFormatoLocal(): string {
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, "0");
  const dia = String(ahora.getDate()).padStart(2, "0");
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");
  return `${anio}-${mes}-${dia}T${horas}:${minutos}`;
}

export function ModalInformarTransferencia({
  open,
  onOpenChange,
  idInscripcion,
  montoSugerido,
  nombrePlan,
}: Props) {
  const mutation = useInformarTransferencia();

  const [monto, setMonto] = useState<string>(String(montoSugerido));
  const [fechaHora, setFechaHora] = useState<string>(ahoraEnFormatoLocal());
  const [titular, setTitular] = useState<string>("");
  const [observaciones, setObservaciones] = useState<string>("");

  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [exitoMensaje, setExitoMensaje] = useState<string | null>(null);

  const montoNumero = Number(monto);
  const difiereMonto = !isNaN(montoNumero) && montoNumero > 0 && montoNumero !== montoSugerido;

  function reiniciarFormulario() {
    setMonto(String(montoSugerido));
    setFechaHora(ahoraEnFormatoLocal());
    setTitular("");
    setObservaciones("");
    setErrorValidacion(null);
    setExitoMensaje(null);
  }

  function handleCerrar(nuevoEstado: boolean) {
    if (!nuevoEstado) {
      reiniciarFormulario();
    }
    onOpenChange(nuevoEstado);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorValidacion(null);

    const parseResultado = informarTransferenciaFormSchema.safeParse({
      id_inscripcion: idInscripcion,
      monto: Number(monto),
      fecha_hora_transferencia: fechaHora,
      titular_cuenta_origen: titular,
      observaciones,
    });

    if (!parseResultado.success) {
      setErrorValidacion(parseResultado.error.issues[0]?.message ?? "Datos del formulario inválidos");
      return;
    }

    try {
      await mutation.mutateAsync(parseResultado.data);
      setExitoMensaje(
        "Aviso de transferencia registrado con éxito. Quedó pendiente de verificación y podés asistir a tus clases normalmente.",
      );
      setTimeout(() => {
        handleCerrar(false);
      }, 2000);
    } catch (error) {
      setErrorValidacion(mensajeDeErrorApi(error, "No se pudo registrar el aviso de transferencia"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300">
              <Send className="size-4.5" aria-hidden="true" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
                Informar transferencia
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Registrá los datos de la transferencia que realizaste para {nombrePlan}.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {exitoMensaje ? (
          <div className="my-6 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-center text-sm font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
            {exitoMensaje}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {errorValidacion && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{errorValidacion}</span>
              </div>
            )}

            {/* Monto */}
            <div className="space-y-1.5">
              <Label htmlFor="monto-transferencia" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Monto transferido ($) *
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="monto-transferencia"
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  placeholder="30000"
                  className="min-h-[44px] rounded-xl pl-9 font-bold dark:bg-slate-800"
                />
              </div>
              {difiereMonto && (
                <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  El monto ingresado difiere del valor sugerido del plan ({formatearPrecio(montoSugerido)}). Se enviará a revisión con este importe.
                </p>
              )}
            </div>

            {/* Fecha y hora */}
            <div className="space-y-1.5">
              <Label htmlFor="fecha-hora-transferencia" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Fecha y hora de la operación *
              </Label>
              <div className="relative">
                <Input
                  id="fecha-hora-transferencia"
                  type="datetime-local"
                  required
                  max={ahoraEnFormatoLocal()}
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  className="min-h-[44px] rounded-xl dark:bg-slate-800"
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Momento en que se acreditó la transferencia en tu app o comprobante bancario.
              </p>
            </div>

            {/* Titular de la cuenta origen */}
            <div className="space-y-1.5">
              <Label htmlFor="titular-cuenta-origen" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Titular de la cuenta de origen <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Input
                id="titular-cuenta-origen"
                type="text"
                maxLength={80}
                value={titular}
                onChange={(e) => setTitular(e.target.value)}
                placeholder="Ej: Si transferiste desde la cuenta de otra persona"
                className="min-h-[44px] rounded-xl dark:bg-slate-800"
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-1.5">
              <Label htmlFor="observaciones-transferencia" className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Observaciones o número de comprobante <span className="font-normal text-slate-400">(opcional)</span>
              </Label>
              <Textarea
                id="observaciones-transferencia"
                maxLength={255}
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Número de operación bancaria o notas adicionales"
                className="rounded-xl text-xs dark:bg-slate-800"
              />
            </div>

            <DialogFooter className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={() => handleCerrar(false)}
                className="min-h-[44px] rounded-xl dark:border-slate-700 dark:text-slate-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="min-h-[44px] rounded-xl bg-primary px-5 text-sm font-extrabold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Enviando aviso...
                  </>
                ) : (
                  "Confirmar aviso"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
