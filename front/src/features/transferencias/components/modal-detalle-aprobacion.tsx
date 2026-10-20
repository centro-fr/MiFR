import { useState } from "react";
import { AlertTriangle, Clock, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAlumno } from "@/features/alumnos/hooks/use-alumnos";
import { tipoDeTransferencia } from "@/features/transferencias/utils/formato-transferencia";
import { tramoDePlazo } from "@/features/transferencias/utils/plazo-verificacion";
import type { Transferencia } from "@/types/transferencia";
import { cn } from "@/utils/cn";
import { formatearPrecio } from "@/utils/moneda";

interface Props {
  transferencia: Transferencia | null;
  open: boolean;
  onClose: () => void;
  onAprobar: (transferencia: Transferencia, confirmarMontoDistinto: boolean) => void;
  onRechazar: (transferencia: Transferencia, motivo: string) => void;
  aprobando?: boolean;
  rechazando?: boolean;
}

function formatearDiaHora(fechaIso: string | null | undefined): string {
  if (!fechaIso) return "—";
  const fecha = new Date(fechaIso);
  if (isNaN(fecha.getTime())) return "—";
  const dia = String(fecha.getDate()).padStart(2, "0");
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const horas = String(fecha.getHours()).padStart(2, "0");
  const minutos = String(fecha.getMinutes()).padStart(2, "0");
  return `${dia}/${mes} ${horas}:${minutos}`;
}

export function ModalDetalleAprobacion({
  transferencia,
  open,
  onClose,
  onAprobar,
  onRechazar,
  aprobando = false,
  rechazando = false,
}: Props) {
  const [modoRechazo, setModoRechazo] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const idAlumno = transferencia?.alumno.id ?? 0;
  const { data: ficha } = useAlumno(idAlumno);

  if (!transferencia) return null;

  const plan = ficha?.inscripcion?.plan;
  const precioPlan = plan?.precio ?? 0;
  const diferencia = precioPlan > 0 ? precioPlan - transferencia.monto : 0;
  const tieneDiferenciaMonto = precioPlan > 0 && diferencia !== 0;

  const tipo = ficha ? tipoDeTransferencia(ficha) : null;
  const estadoCuota = ficha?.inscripcion?.situacion_cuota?.estado;
  const textoTipoPago =
    tipo === "PRIMERA_CUOTA"
      ? "Primera cuota / Alta"
      : estadoCuota === "VENCIDA"
      ? "Cuota vencida"
      : estadoCuota === "POR_VENCER"
      ? "Cuota por vencer"
      : "Cuota";

  const tramo = tramoDePlazo(transferencia);
  const textoInformada =
    tramo === "vencida"
      ? `Hace ${transferencia.horasDesdeLaCarga} h · pasó el plazo`
      : `Hace ${transferencia.horasDesdeLaCarga} h`;

  const handleCerrar = () => {
    if (aprobando || rechazando) return;
    setModoRechazo(false);
    setMotivoRechazo("");
    onClose();
  };

  const handleConfirmarAprobacion = () => {
    onAprobar(transferencia, tieneDiferenciaMonto);
  };

  const handleConfirmarRechazo = () => {
    if (!motivoRechazo.trim()) return;
    onRechazar(transferencia, motivoRechazo.trim());
  };

  return (
    <Dialog open={open} onOpenChange={(abierto) => !abierto && handleCerrar()}>
      <DialogContent className="max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:rounded-3xl dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Transferencia · {textoTipoPago}
              </p>
              <DialogTitle className="text-xl font-black text-slate-900 tracking-tight dark:text-white">
                {transferencia.alumno.nombre} {transferencia.alumno.apellido}
              </DialogTitle>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              disabled={aprobando || rechazando}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-5" />
              <span className="sr-only">Cerrar</span>
            </button>
          </div>

          {/* Importe y badge de tiempo */}
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="block text-xs font-semibold text-slate-500 dark:text-slate-400">
                Transfirió
              </span>
              <span className="text-3xl font-black text-slate-900 dark:text-white">
                {formatearPrecio(transferencia.monto)}
              </span>
            </div>

            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
                tramo === "vencida"
                  ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
              )}
            >
              <Clock className="size-3.5" />
              <span>Hace {transferencia.horasDesdeLaCarga} h</span>
            </span>
          </div>

          {/* Advertencia si el monto difiere del plan */}
          {tieneDiferenciaMonto && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p>
                <strong>
                  Son {formatearPrecio(Math.abs(diferencia))}{" "}
                  {diferencia > 0 ? "menos" : "más"}
                </strong>{" "}
                que el precio del plan. Podés aprobarla igual o rechazarla.
              </p>
            </div>
          )}

          {/* Modo rechazo: input de motivo */}
          {modoRechazo ? (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-3.5 dark:border-rose-900/50 dark:bg-rose-950/20">
              <label
                htmlFor="motivo-rechazo-input"
                className="block text-xs font-bold text-rose-900 dark:text-rose-300"
              >
                Motivo del rechazo (se le informará al alumno)
              </label>
              <Input
                id="motivo-rechazo-input"
                autoFocus
                placeholder="Ej: El dinero no ingresó a la cuenta bancaria"
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="h-10 text-xs bg-white dark:bg-slate-900"
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModoRechazo(false)}
                  disabled={rechazando}
                  className="rounded-xl text-xs font-semibold"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmarRechazo}
                  disabled={!motivoRechazo.trim() || rechazando}
                  className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  {rechazando ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    "Confirmar rechazo"
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Lista clave-valor */
            <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Alumno</span>
                <span className="font-bold text-primary dark:text-pink-300">
                  {transferencia.alumno.nombre} {transferencia.alumno.apellido}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Tipo de pago</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {textoTipoPago}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Plan</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {plan?.nombre ?? "—"}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Precio del plan</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {precioPlan > 0 ? formatearPrecio(precioPlan) : "—"}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Monto transferido</span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {formatearPrecio(transferencia.monto)}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">
                  Fecha de la transferencia
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatearDiaHora(transferencia.realizadaEl)}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">
                  Titular de la cuenta
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {transferencia.titularCuenta || "—"}
                </span>
              </div>

              <div className="flex justify-between py-2.5">
                <span className="text-slate-500 dark:text-slate-400">Informada</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {textoInformada}
                </span>
              </div>
            </div>
          )}

          {/* Acciones */}
          {!modoRechazo && (
            <div className="flex items-center justify-between gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModoRechazo(true)}
                disabled={aprobando || rechazando}
                className="h-10 rounded-xl border-slate-200 px-4 text-xs font-bold text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-300"
              >
                Rechazar
              </Button>

              <Button
                type="button"
                onClick={handleConfirmarAprobacion}
                disabled={aprobando || rechazando}
                className="h-10 flex-1 rounded-xl bg-primary px-5 text-xs font-extrabold text-white shadow-md shadow-primary/20 hover:bg-primary-dark"
              >
                {aprobando ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Aprobando...
                  </>
                ) : (
                  "Aprobar transferencia"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
