import { useState, type FormEvent, type ReactNode } from "react";
import { BadgeCheck } from "lucide-react";
import { mensajeDeErrorApi } from "@/api/errores";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { esMontoDistinto } from "@/features/alumnos/api/alta-definitiva-api";
import {
  aCuerpoPrimerPago,
  crearPrimerPagoSchema,
  fechaHoraParaInput,
  requiereConfirmarMonto,
  valoresInicialesPrimerPago,
  type CuerpoPrimerPago,
  type PrimerPagoFormValues,
} from "@/features/alumnos/schemas/primer-pago";
import { formatearPrecio, textoHorarios } from "@/features/alumnos/utils/pendientes-de-alta";
import type { FormaPrimerPago, PreInscripcionPendiente } from "@/types/alta-definitiva";

const ETIQUETA_FORMA: Record<FormaPrimerPago, { titulo: string; detalle: string }> = {
  EFECTIVO: { titulo: "Efectivo", detalle: "Lo cobraste en el centro." },
  TRANSFERENCIA: { titulo: "Transferencia", detalle: "Ya la viste acreditada en tu cuenta." },
};

type Errores = Partial<Record<keyof PrimerPagoFormValues, string>>;

function erroresDe(issues: { path: (string | number)[]; message: string }[]): Errores {
  return Object.fromEntries(issues.map((issue) => [issue.path[0], issue.message]));
}

interface CampoProps {
  id: string;
  etiqueta: string;
  error?: string;
  ayuda?: string;
  obligatorio?: boolean;
  children: (describedBy: string | undefined) => ReactNode;
}

function Campo({ id, etiqueta, error, ayuda, obligatorio = false, children }: CampoProps) {
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

const CLASE_INPUT = "rounded-xl border-slate-200 bg-white dark:border-white/15 dark:bg-transparent";

function ResumenPreInscripcion({ pendiente }: { pendiente: PreInscripcionPendiente }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-slate-50 p-3 text-sm dark:bg-white/5">
      <dt className="text-muted-foreground">Plan</dt>
      <dd className="text-right font-bold">
        {pendiente.nombrePlan} · {formatearPrecio(pendiente.precio)}
      </dd>
      <dt className="text-muted-foreground">Profesora</dt>
      <dd className="text-right font-bold">{pendiente.profesora}</dd>
      <dt className="text-muted-foreground">Horario</dt>
      <dd className="text-right font-bold">{textoHorarios(pendiente.horarios)}</dd>
    </dl>
  );
}

interface SelectorFormaProps {
  formas: FormaPrimerPago[];
  valor: FormaPrimerPago;
  onChange: (forma: FormaPrimerPago) => void;
}

function SelectorFormaPago({ formas, valor, onChange }: SelectorFormaProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-200">¿Cómo abonó la primera cuota?</legend>
      <RadioGroup value={valor} onValueChange={(v) => onChange(v as FormaPrimerPago)} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {formas.map((forma) => (
          <Label
            key={forma}
            htmlFor={`forma-pago-${forma}`}
            className="flex min-h-[44px] cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-pink-50 dark:border-white/15 dark:has-data-[state=checked]:bg-primary/15"
          >
            <RadioGroupItem id={`forma-pago-${forma}`} value={forma} className="mt-0.5" />
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{ETIQUETA_FORMA[forma].titulo}</span>
              <span className="text-xs font-medium text-muted-foreground">{ETIQUETA_FORMA[forma].detalle}</span>
            </span>
          </Label>
        ))}
      </RadioGroup>
    </fieldset>
  );
}

interface ConfirmacionMontoProps {
  mensaje: string;
  marcado: boolean;
  error?: string;
  onChange: (marcado: boolean) => void;
}

function ConfirmacionMonto({ mensaje, marcado, error, onChange }: ConfirmacionMontoProps) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/20 dark:bg-amber-500/10">
      <p role="status" className="text-sm text-amber-900 dark:text-amber-200">
        {mensaje}
      </p>
      <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-sm font-bold text-amber-950 dark:text-amber-100">
        <input
          type="checkbox"
          checked={marcado}
          onChange={(evento) => onChange(evento.target.checked)}
          aria-invalid={error !== undefined}
          aria-describedby={error ? "confirmar-monto-error" : undefined}
          className="size-4 accent-primary"
        />
        Confirmo el monto distinto
      </label>
      {error && (
        <p id="confirmar-monto-error" className="text-sm font-semibold text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}

interface CamposTransferenciaProps {
  valores: PrimerPagoFormValues;
  errores: Errores;
  onChange: (cambios: Partial<PrimerPagoFormValues>) => void;
}

function CamposTransferencia({ valores, errores, onChange }: CamposTransferenciaProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Campo id="fecha-hora-transferencia" etiqueta="Fecha y hora" error={errores.fechaHoraTransferencia} obligatorio>
        {(describedBy) => (
          <Input
            id="fecha-hora-transferencia"
            type="datetime-local"
            value={valores.fechaHoraTransferencia}
            max={fechaHoraParaInput(new Date())}
            onChange={(evento) => onChange({ fechaHoraTransferencia: evento.target.value })}
            aria-invalid={errores.fechaHoraTransferencia !== undefined}
            aria-describedby={describedBy}
            className={CLASE_INPUT}
          />
        )}
      </Campo>
      <Campo
        id="titular-cuenta"
        etiqueta="Titular de la cuenta"
        ayuda="Opcional: ayuda a encontrarla en el extracto."
        error={errores.titularCuentaOrigen}
      >
        {(describedBy) => (
          <Input
            id="titular-cuenta"
            value={valores.titularCuentaOrigen}
            maxLength={80}
            autoComplete="off"
            onChange={(evento) => onChange({ titularCuentaOrigen: evento.target.value })}
            aria-invalid={errores.titularCuentaOrigen !== undefined}
            aria-describedby={describedBy}
            className={CLASE_INPUT}
          />
        )}
      </Campo>
    </div>
  );
}

interface Props {
  pendiente: PreInscripcionPendiente;
  /** Las formas de pago que la sesión puede registrar (al menos una). */
  formas: FormaPrimerPago[];
  confirmando: boolean;
  error: unknown;
  onClose: () => void;
  onConfirm: (pago: CuerpoPrimerPago) => void;
}

// US-07: el alta definitiva es la consecuencia de registrar el primer pago. El back la hace
// en la misma transacción del cobro y no deja activar a nadie sin un pago confirmado.
export function ModalConfirmarAlta({ pendiente, formas, confirmando, error, onClose, onConfirm }: Props) {
  const [valores, setValores] = useState(() => valoresInicialesPrimerPago(pendiente.precio, formas[0]));
  const [errores, setErrores] = useState<Errores>({});
  const backInformoMontoDistinto = esMontoDistinto(error);
  const contexto = { precio: pendiente.precio, backInformoMontoDistinto };
  const nombre = `${pendiente.nombre} ${pendiente.apellido}`;

  const cambiar = (cambios: Partial<PrimerPagoFormValues>) => {
    setValores((actuales) => ({ ...actuales, ...cambios }));
    setErrores({});
  };

  const confirmar = (evento: FormEvent) => {
    evento.preventDefault();
    const resultado = crearPrimerPagoSchema({ ...contexto, ahora: new Date() }).safeParse(valores);
    if (!resultado.success) {
      setErrores(erroresDe(resultado.error.issues));
      return;
    }
    onConfirm(aCuerpoPrimerPago(pendiente.idInscripcion, resultado.data));
  };

  const mensajeMonto = backInformoMontoDistinto
    ? mensajeDeErrorApi(error, "El monto no coincide con el precio vigente del plan.")
    : `El precio del plan es ${formatearPrecio(pendiente.precio)}.`;
  const errorGeneral = error && !backInformoMontoDistinto ? mensajeDeErrorApi(error, "No se pudo registrar el cobro.") : null;

  return (
    <Dialog
      open
      onOpenChange={(abierto) => {
        if (!abierto && !confirmando) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl border-border p-6 shadow-2xl sm:rounded-2xl dark:bg-surface-low">
        <form onSubmit={confirmar} noValidate className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"
            >
              <BadgeCheck className="size-5" />
            </span>
            <DialogTitle className="text-base font-extrabold text-dark dark:text-white">Confirmar alta de {nombre}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
              Registrá el cobro o la transferencia de su primera cuota. Al guardarlo, queda activo e inscripto en el plan y los horarios que eligió.
            </DialogDescription>
          </div>

          <ResumenPreInscripcion pendiente={pendiente} />
          <SelectorFormaPago formas={formas} valor={valores.formaPago} onChange={(formaPago) => cambiar({ formaPago })} />

          <Campo id="monto-primer-pago" etiqueta="Monto cobrado" ayuda="Sin puntos de miles, por ejemplo 25000 o 25000,50." error={errores.monto} obligatorio>
            {(describedBy) => (
              <Input
                id="monto-primer-pago"
                inputMode="decimal"
                value={valores.monto}
                onChange={(evento) => cambiar({ monto: evento.target.value })}
                aria-invalid={errores.monto !== undefined}
                aria-describedby={describedBy}
                className={CLASE_INPUT}
              />
            )}
          </Campo>

          {requiereConfirmarMonto(valores.monto, contexto) && (
            <ConfirmacionMonto
              mensaje={mensajeMonto}
              marcado={valores.confirmarMontoDistinto}
              error={errores.confirmarMontoDistinto}
              onChange={(confirmarMontoDistinto) => cambiar({ confirmarMontoDistinto })}
            />
          )}

          {valores.formaPago === "TRANSFERENCIA" && <CamposTransferencia valores={valores} errores={errores} onChange={cambiar} />}

          {errorGeneral && (
            <Alert role="alert" className="rounded-xl border-rose-200 bg-rose-50 p-3 dark:border-rose-500/20 dark:bg-rose-500/10">
              <AlertDescription className="text-sm text-rose-900 dark:text-rose-200">{errorGeneral}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-row items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              disabled={confirmando}
              onClick={onClose}
              className="rounded-xl border-slate-200 px-4 font-bold text-slate-600 dark:border-white/15 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={confirmando} className="rounded-xl bg-primary px-4 font-bold text-white shadow-md hover:bg-primary-dark">
              {confirmando ? "Registrando..." : "Registrar y dar de alta"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
