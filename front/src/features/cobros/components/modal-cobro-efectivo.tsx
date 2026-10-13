import { useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, Banknote, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BadgeSituacionCuota } from "@/features/alumnos/components/badge-situacion-cuota";
import { usePermissions } from "@/features/seguridad/hooks/use-permissions";
import { esMontoDistinto } from "@/features/cobros/api/cobros-api";
import { useRegistrarCobroEfectivo } from "@/features/cobros/hooks/use-cobros";
import {
  aCuerpoCobroEfectivo,
  registrarCobroEfectivoFormSchema,
  type RegistrarCobroEfectivoFormValues,
} from "@/features/cobros/schemas/cobro-efectivo.schema";
import type { SituacionCuota } from "@/features/alumnos/schemas/alumno";
import { formatearPrecio } from "@/utils/moneda";
import { mensajeDeErrorApi } from "@/api/errores";

export interface DatosAlumnoCobro {
  id_alumno: number;
  nombre: string;
  apellido: string;
  dni: string | null;
}

export interface DatosInscripcionCobro {
  id_inscripcion: number;
  nombre_plan: string;
  precio_vigente: number;
  situacion_cuota?: SituacionCuota | null;
}

interface Props {
  abierto: boolean;
  onClose: () => void;
  alumno: DatosAlumnoCobro;
  inscripcion: DatosInscripcionCobro;
  onExito: (idPago: number) => void;
}

type Errores = Partial<Record<keyof RegistrarCobroEfectivoFormValues, string>>;

function Campo({
  id,
  etiqueta,
  error,
  ayuda,
  obligatorio = false,
  children,
}: {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}) {
  const describedBy = [ayuda && `${id}-ayuda`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-sm font-bold text-slate-800 dark:text-slate-200">
        {etiqueta}
        {obligatorio && (
          <>
            <span className="text-rose-600" aria-hidden="true"> *</span>
            <span className="sr-only"> (obligatorio)</span>
          </>
        )}
      </Label>
      {children(describedBy)}
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-xs text-muted-foreground">
          {ayuda}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

export function ModalCobroEfectivo({
  abierto,
  onClose,
  alumno,
  inscripcion,
  onExito,
}: Props) {
  const { hasRole } = usePermissions();
  const esSoloProfesora = hasRole("PROFESORA") && !hasRole("PROPIETARIA");
  const registrarMutation = useRegistrarCobroEfectivo();

  const [monto, setMonto] = useState(String(inscripcion.precio_vigente));
  const [confirmarMontoDistinto, setConfirmarMontoDistinto] = useState(false);
  const [observaciones, setObservaciones] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [errorApi, setErrorApi] = useState<string | null>(null);

  // Calcula si el monto cargado difiere del esperado del plan
  const montoNumerico = Number(monto.trim().replace(",", "."));
  const esDistinto = Number.isFinite(montoNumerico) && montoNumerico > 0 && montoNumerico !== inscripcion.precio_vigente;

  function validar(): RegistrarCobroEfectivoFormValues | null {
    const valores: RegistrarCobroEfectivoFormValues = {
      idInscripcion: inscripcion.id_inscripcion,
      monto,
      confirmarMontoDistinto,
      observaciones: observaciones || undefined,
    };

    const resultado = registrarCobroEfectivoFormSchema.safeParse(valores);
    if (!resultado.success) {
      const mapeoErrores: Errores = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as keyof RegistrarCobroEfectivoFormValues;
        mapeoErrores[campo] = issue.message;
      }
      setErrores(mapeoErrores);
      return null;
    }

    if (esDistinto && !confirmarMontoDistinto) {
      setErrores({
        confirmarMontoDistinto: "Debés confirmar que el monto a cobrar es distinto del precio del plan.",
      });
      return null;
    }

    setErrores({});
    return resultado.data;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorApi(null);

    const datos = validar();
    if (!datos) return;

    try {
      const cuerpo = aCuerpoCobroEfectivo(datos);
      const pagoCreado = await registrarMutation.mutateAsync(cuerpo);
      toast.success("Cobro en efectivo registrado correctamente");
      onExito(pagoCreado.id_pago);
    } catch (err: unknown) {
      if (esMontoDistinto(err)) {
        setErrorApi(
          `El monto cobrado difiere del precio vigente (${formatearPrecio(inscripcion.precio_vigente)}). Para registrarlo, marcá la casilla de confirmación.`,
        );
      } else {
        setErrorApi(mensajeDeErrorApi(err, "No se pudo registrar el cobro en efectivo."));
      }
    }
  }

  return (
    <Dialog open={abierto} onOpenChange={(abrir) => !abrir && onClose()}>
      <DialogContent className="max-w-md rounded-2xl border-slate-200 bg-white p-6 shadow-xl sm:max-w-lg dark:border-slate-700 dark:bg-slate-900">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-pink-100 text-[#BC1266] dark:bg-pink-950/70 dark:text-pink-300">
              <Banknote className="size-5" />
            </span>
            <DialogTitle className="text-lg font-black text-[#181C26] dark:text-white">
              Registrar cobro en efectivo
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Cobro presencial de la cuota del alumno. Al confirmar se emite el recibo digital.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen del alumno y cuota */}
        <div className="my-1 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm dark:border-slate-800 dark:bg-slate-800/50">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Alumno</p>
              <h3 className="font-bold text-[#181C26] dark:text-white">
                {alumno.nombre} {alumno.apellido}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {alumno.dni ? `DNI: ${alumno.dni}` : "Sin DNI"} · ALU-{String(alumno.id_alumno).padStart(3, "0")}
              </p>
            </div>
            {inscripcion.situacion_cuota && (
              <div className="text-right">
                <p className="mb-1 text-xs font-semibold text-slate-500 dark:text-slate-400">Estado actual</p>
                <BadgeSituacionCuota situacion={inscripcion.situacion_cuota} />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2.5 text-xs dark:border-slate-700/60">
            <span className="text-slate-600 dark:text-slate-300">
              Plan: <strong className="font-semibold text-slate-900 dark:text-white">{inscripcion.nombre_plan}</strong>
            </span>
            <span className="text-slate-600 dark:text-slate-300">
              Precio vigente:{" "}
              <strong className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatearPrecio(inscripcion.precio_vigente)}
              </strong>
            </span>
          </div>
        </div>

        {/* Aviso de rendición si cobra la profesora (US-19) */}
        {esSoloProfesora && (
          <Alert className="border-amber-200 bg-amber-50 py-2.5 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
            <Info className="size-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs">
              Este cobro en efectivo quedará registrado a tu cargo como <strong>pendiente de rendición </strong>
              hasta entregarlo a la administración.
            </AlertDescription>
          </Alert>
        )}

        {/* Alerta de error de API */}
        {errorApi && (
          <Alert variant="destructive" className="py-2.5">
            <AlertCircle className="size-4" />
            <AlertDescription className="text-xs">{errorApi}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <Campo
            id="monto-cobro"
            etiqueta="Monto cobrado ($)"
            error={errores.monto}
            ayuda="Por defecto el precio vigente de la cuota del plan."
            obligatorio
          >
            {(describedBy) => (
              <Input
                id="monto-cobro"
                type="text"
                inputMode="decimal"
                aria-describedby={describedBy}
                aria-invalid={Boolean(errores.monto)}
                value={monto}
                onChange={(e) => {
                  setMonto(e.target.value);
                  setErrores((prev) => ({ ...prev, monto: undefined }));
                }}
                className="rounded-xl border-slate-200 bg-white font-bold text-[#181C26] dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                placeholder="25000"
                autoFocus
              />
            )}
          </Campo>

          {/* Advertencia y confirmación si el monto difiere del precio vigente */}
          {esDistinto && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs dark:border-amber-800/40 dark:bg-amber-950/30">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <p>
                  El monto ingresado (<strong>{formatearPrecio(montoNumerico)}</strong>) no coincide con el valor
                  del plan (<strong>{formatearPrecio(inscripcion.precio_vigente)}</strong>).
                </p>
              </div>
              <label className="mt-2.5 flex cursor-pointer items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={confirmarMontoDistinto}
                  onChange={(e) => {
                    setConfirmarMontoDistinto(e.target.checked);
                    setErrores((prev) => ({ ...prev, confirmarMontoDistinto: undefined }));
                  }}
                  className="size-4 rounded border-slate-300 text-[#BC1266] focus:ring-[#BC1266]"
                />
                Confirmo que el cobro es por un monto distinto al precio vigente
              </label>
              {errores.confirmarMontoDistinto && (
                <p className="mt-1 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {errores.confirmarMontoDistinto}
                </p>
              )}
            </div>
          )}

          <Campo id="observaciones-cobro" etiqueta="Observaciones (opcional)" error={errores.observaciones}>
            {(describedBy) => (
              <Textarea
                id="observaciones-cobro"
                aria-describedby={describedBy}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                maxLength={255}
                rows={2}
                className="rounded-xl border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-800"
                placeholder="Anotaciones sobre el cobro o descuento especial..."
              />
            )}
          </Campo>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={registrarMutation.isPending}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={registrarMutation.isPending}
              className="min-h-[44px] bg-[#BC1266] font-bold text-white hover:bg-[#9D1055] dark:bg-pink-700 dark:hover:bg-pink-600"
            >
              {registrarMutation.isPending ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Registrando cobro...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 size-4" />
                  Confirmar cobro
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
